<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import QrScanner from '$lib/components/qr-scanner.svelte';
  import {
    computeDashboardStats,
    computeEnhancedStats,
    exportFilename,
    localOr,
    parseReceiptUrl,
    toCsv,
    toJson,
    toPdf,
    useReceipts,
    type ExportFilters
  } from '$lib/receipts';
  import type { ReceiptRecord } from '$lib/types';
  import { formatCurrency, formatMonthLabel, formatDateTime, formatPeriodLabel, slugCategory } from '$lib/utils/format';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  type ExportScope = 'current' | 'all' | 'custom';

  let sourceUrl = $state('');
  let appliedForm = $state<ActionData | null>(null);
  let sourceInput: HTMLInputElement | null = null;
  let importError = $state<string | null>(null);
  let exportScope = $state<ExportScope>('all');
  let exportFrom = $state('');
  let exportTo = $state('');
  let exportCategory = $state('');
  let exportLimit = $state('all');
  let exportPreviewTotal = $state(0);
  let exportPreviewLimited = $state(0);

  const store = useReceipts(() => data);
  const isLocal = $derived(store.kind === 'local');
  const records = $derived(store.records);

  function matchesFilters(record: ReceiptRecord, filters: ExportFilters): boolean {
    if (filters.month && record.urlDate.slice(0, 7) !== filters.month) return false;
    if (filters.from && record.urlDate < filters.from) return false;
    if (filters.to && record.urlDate > filters.to) return false;
    if (filters.category) {
      if (filters.category === '__unsorted__') {
        if (record.category && record.category.trim() !== '') return false;
      } else if (record.category !== filters.category) {
        return false;
      }
    }
    return true;
  }

  function distinctCategories(records: ReceiptRecord[]): string[] {
    const seen = new Set<string>();
    for (const record of records) {
      seen.add(record.category && record.category.trim() !== '' ? record.category : 'Unsorted');
    }
    return [...seen].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  const view = $derived.by(() => {
    const ledgerFilters: ExportFilters = { month: data.month, category: data.category };
    const filtered = records.filter((record) => matchesFilters(record, ledgerFilters));
    return {
      receipts: filtered,
      stats: computeDashboardStats(records),
      enhancedStats: computeEnhancedStats(records, data.period),
      categories: distinctCategories(filtered),
      exportCategories: distinctCategories(records)
    };
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTotal = $derived(
    view.stats.monthlySpend.find((month) => month.month === currentMonth)?.total ?? 0
  );
  const maxPeriodTotal = $derived(
    view.enhancedStats.periodTotals.reduce((max, p) => Math.max(max, p.total), 0)
  );
  const maxCategoryTotal = $derived(
    view.stats.topCategories.reduce((max, c) => Math.max(max, c.total), 0)
  );

  function defaultFromDate(month: string | null): string {
    return month ? `${month}-01` : '';
  }

  function defaultToDate(month: string | null): string {
    if (!month) return '';
    const [year, rawMonth] = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, rawMonth, 0));
    return lastDay.toISOString().slice(0, 10);
  }

  function buildExportFilters(): ExportFilters {
    const filters: ExportFilters = {};
    if (exportScope === 'current') {
      if (data.month) filters.month = data.month;
      if (data.category) filters.category = data.category;
    } else if (exportScope === 'custom') {
      if (exportFrom) filters.from = exportFrom;
      if (exportTo) filters.to = exportTo;
      if (exportCategory) filters.category = exportCategory;
    }
    if (exportLimit !== 'all') filters.limit = Number.parseInt(exportLimit, 10);
    return filters;
  }

  function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportClient(format: 'csv' | 'json' | 'pdf', pdfMode: 'compact' | 'full' = 'compact'): void {
    const filters: ExportFilters = { ...buildExportFilters(), pdfMode };
    const matching = records.filter((record) => matchesFilters(record, filters));
    const limited = filters.limit ? matching.slice(0, filters.limit) : matching;

    if (format === 'csv') {
      downloadBlob(new Blob([toCsv(limited)], { type: 'text/csv;charset=utf-8' }), exportFilename(filters, 'csv'));
    } else if (format === 'json') {
      downloadBlob(
        new Blob([toJson(limited, filters)], { type: 'application/json' }),
        exportFilename(filters, 'json')
      );
    } else {
      const buffer = toPdf(limited, filters);
      const suffix = pdfMode === 'full' ? 'full' : undefined;
      downloadBlob(new Blob([buffer], { type: 'application/pdf' }), exportFilename(filters, 'pdf', suffix));
    }
  }

  function currentFiltersLabel(): string {
    const parts: string[] = [];
    if (data.month) parts.push(formatMonthLabel(data.month));
    if (data.category) parts.push(data.category === '__unsorted__' ? 'Unsorted' : data.category);
    return parts.length ? parts.join(' - ') : 'No page filters';
  }

  function previewLabel(): string {
    if (exportPreviewTotal === exportPreviewLimited) {
      return `${exportPreviewTotal} receipt${exportPreviewTotal === 1 ? '' : 's'} ready`;
    }
    return `${exportPreviewTotal} match, exporting ${exportPreviewLimited}`;
  }

  function useCustomScope() {
    exportScope = 'custom';
  }

  function periodTabUrl(period: string): string {
    const params = new URLSearchParams();
    if (data.month) params.set('month', data.month);
    if (data.category) params.set('category', data.category);
    params.set('period', period);
    return `/?${params.toString()}`;
  }

  $effect(() => {
    if (!form || form === appliedForm) return;
    const values = 'values' in form ? (form.values as Record<string, string | undefined>) : null;
    sourceUrl = values?.source_url ?? '';
    appliedForm = form;
  });

  $effect(() => {
    exportScope = data.month || data.category ? 'current' : 'all';
    exportFrom = defaultFromDate(data.month);
    exportTo = defaultToDate(data.month);
    exportCategory = data.category ?? '';
    exportLimit = 'all';
  });

  $effect(() => {
    const filters = buildExportFilters();
    const matching = records.filter((record) => matchesFilters(record, filters));
    exportPreviewTotal = matching.length;
    exportPreviewLimited = filters.limit ? Math.min(filters.limit, matching.length) : matching.length;
  });

  function handleScannerResult(value: string) {
    sourceUrl = value;
    sourceInput?.focus();
  }
</script>

<svelte:head>
  <title>Receipt Ledger</title>
  <meta
    name="description"
    content="Track Moldova MEV receipts locally in your browser, or sign in to a synced ledger."
  />
</svelte:head>

<div class="app-shell">
  <header class="app-header">
    <h1 class="app-title">Receipt Ledger</h1>
    <div class="header-actions">
      <div class="status-note">{view.stats.receiptCount} receipts</div>
      {#if data.user?.kind === 'remote'}
        <a class="button-ghost" href="/settings/security">Security</a>
      {/if}
      {#if data.user}
        <form method="POST" action="/?/logout">
          <button class="button-ghost" type="submit">Sign out</button>
        </form>
      {/if}
    </div>
  </header>

  <div class="dashboard stack">
    {#if data.user?.kind === 'remote' && !data.user.twoFactorEnabled}
      <div class="alert compact">
        Two-factor authentication is off. <a href="/settings/security">Set it up now</a> before adding more data.
      </div>
    {/if}

    <!-- Import bar -->
    <form
      method="POST"
      action="?/ingest"
      class="import-bar"
      use:enhance={localOr(data, (formData) => {
        importError = null;
        const raw = formData.get('source_url')?.toString() ?? '';
        const metadata = parseReceiptUrl(raw);
        if (!metadata) {
          importError = 'Paste or scan a full MEV receipt URL.';
          return;
        }
        goto(`/receipts/new?prefill=${encodeURIComponent(metadata.sourceUrl)}`);
      })}
    >
      <input
        bind:this={sourceInput}
        bind:value={sourceUrl}
        class="input"
        type="url"
        name="source_url"
        placeholder="Paste a receipt URL"
        required
      />
      <QrScanner onscan={handleScannerResult} />
      <button class="button" type="submit">Import</button>
      <a class="button-ghost" href="/receipts/new">Add manually</a>
    </form>

    {#if importError}
      <div class="alert compact error">{importError}</div>
    {:else if form?.message}
      <div class={`alert compact ${form.type === 'error' ? 'error' : 'success'}`}>{form.message}</div>
    {/if}

    <!-- Inline filters -->
    <div class="ledger-layout">
      <aside class="ledger-sidebar stack">
        <details class="panel export-panel">
          <summary class="export-summary">
            <span>Export receipts</span>
            <span class="export-summary-value">
              {#if exportScope === 'current'}
                Current view
              {:else if exportScope === 'custom'}
                Custom range
              {:else}
                All receipts
              {/if}
            </span>
          </summary>

          <div class="export-panel-body stack-sm">
            <div class="export-grid">
              <label class="field">
                <span class="label">Range</span>
                <select class="select" bind:value={exportScope}>
                  <option value="all">All receipts</option>
                  <option value="current">Current page filters</option>
                  <option value="custom">Custom dates</option>
                </select>
              </label>

              <label class="field">
                <span class="label">Max receipts</span>
                <select class="select" bind:value={exportLimit}>
                  <option value="all">All matches</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                  <option value="500">500</option>
                  <option value="1000">1000</option>
                </select>
              </label>

              <label class="field">
                <span class="label">From</span>
                <input
                  class="input"
                  type="date"
                  bind:value={exportFrom}
                  onfocus={useCustomScope}
                  onchange={useCustomScope}
                />
              </label>

              <label class="field">
                <span class="label">To</span>
                <input
                  class="input"
                  type="date"
                  bind:value={exportTo}
                  onfocus={useCustomScope}
                  onchange={useCustomScope}
                />
              </label>

              <label class="field export-grid-wide">
                <span class="label">Category</span>
                <select class="select" bind:value={exportCategory} onchange={useCustomScope}>
                  <option value="">All categories</option>
                  <option value="__unsorted__">Unsorted</option>
                  {#each view.exportCategories.filter((category) => category !== 'Unsorted') as category}
                    <option value={category}>{category}</option>
                  {/each}
                </select>
              </label>
            </div>

            <div class="export-meta-row">
              {#if exportScope === 'current'}
                <div class="export-note">Current filters: {currentFiltersLabel()}</div>
              {/if}
              <div class="export-note">{previewLabel()}</div>
            </div>

            <div class="export-actions">
              <button class="button-secondary export-link" type="button" onclick={() => exportClient('csv')}>Download CSV</button>
              <button class="button-secondary export-link" type="button" onclick={() => exportClient('json')}>Download full JSON</button>
              <button class="button-secondary export-link" type="button" onclick={() => exportClient('pdf', 'compact')}>Download PDF compact</button>
              <button class="button-secondary export-link" type="button" onclick={() => exportClient('pdf', 'full')}>Download PDF full</button>
            </div>
          </div>
        </details>

        {#if view.enhancedStats.periodTotals.length || view.stats.topCategories.length}
          <section class="summary-grid-stacked">
            <div class="summary-card">
              <div class="summary-label">Tracked spend</div>
              <div class="summary-value">{formatCurrency(view.stats.totalSpend)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">This month</div>
              <div class="summary-value">{formatCurrency(currentMonthTotal)}</div>
            </div>
          </section>

          <div class="stats-group">
            <div class="stats-group-header">
              <div class="period-tabs">
                {#each ['weekly', 'monthly', 'yearly'] as p}
                  <a class={`period-tab ${data.period === p ? 'active' : ''}`} href={periodTabUrl(p)}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </a>
                {/each}
              </div>
            </div>
            {#each view.enhancedStats.periodTotals.slice(0, 6) as entry}
              <div class="stat-row">
                <span class="stat-label">{formatPeriodLabel(view.enhancedStats.period, entry.period)}</span>
                <div class="stat-bar-track">
                  <div class="stat-bar-fill" style={`width:${maxPeriodTotal ? (entry.total / maxPeriodTotal) * 100 : 0}%`}></div>
                </div>
                <span class="stat-value">{formatCurrency(entry.total)}</span>
              </div>
            {/each}
          </div>

          {#if view.stats.topCategories.length}
            <div class="stats-group">
              <div class="stats-group-label">Categories</div>
              {#each view.stats.topCategories.slice(0, 4) as cat}
                <div class="stat-row">
                  <span class="stat-label">{cat.category}</span>
                  <div class="stat-bar-track">
                    <div class="stat-bar-fill" style={`width:${maxCategoryTotal ? (cat.total / maxCategoryTotal) * 100 : 0}%`}></div>
                  </div>
                  <span class="stat-value">{formatCurrency(cat.total)}</span>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </aside>

      <div class="ledger-main stack">
        <div class="filter-group">
          <span class="filter-label">Month</span>
          <div class="filter-row">
            <a
              class={`tab-link ${!data.month ? 'active' : ''}`}
              href={data.category ? `/?${new URLSearchParams({ category: data.category }).toString()}` : '/'}
            >
              All
            </a>
            {#each view.stats.monthlySpend.slice().reverse() as month}
              <a
                class={`tab-link ${data.month === month.month ? 'active' : ''}`}
                href={`/?${new URLSearchParams({ month: month.month, ...(data.category ? { category: data.category } : {}) }).toString()}`}
              >
                {formatMonthLabel(month.month)}
              </a>
            {/each}
          </div>
        </div>

        <div class="filter-group">
          <span class="filter-label">Category</span>
          <div class="filter-row">
            <a class={`tab-link ${!data.category ? 'active' : ''}`} href={data.month ? `/?month=${data.month}` : '/'}>All</a>
            {#each view.categories as category}
              <a
                class={`tab-link ${slugCategory(data.category) === slugCategory(category) ? 'active' : ''}`}
                href={`/?${new URLSearchParams({ ...(data.month ? { month: data.month } : {}), category: category === 'Unsorted' ? '__unsorted__' : category }).toString()}`}
              >
                {category}
              </a>
            {/each}
          </div>
        </div>

        <!-- Ledger -->
        <section class="panel">
          <div class="receipt-list">
            {#if view.receipts.length}
              {#each view.receipts as receipt}
                <a class="receipt-row" href={`/receipts/${receipt.id}`}>
                  <div>
                     <h3 class="receipt-name">{receipt.merchantName}</h3>
                     <div class="meta-row detail-meta">
                       <span>{formatDateTime(receipt.issuedAt)}</span>
                       <span>{receipt.category || 'Unsorted'}</span>
                       <span>ECC {receipt.eccId}</span>
                       <span>#{receipt.urlReceiptNumber}</span>
                     </div>
                   </div>
                  <div class="amount">{formatCurrency(receipt.total)}</div>
                </a>
              {/each}
            {:else}
              <div class="empty-state">Paste your first MEV URL to start the ledger.</div>
            {/if}
          </div>
        </section>
      </div>
    </div>
  </div>
</div>
