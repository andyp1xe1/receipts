<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import AppHeader from '$lib/components/app-header.svelte';
  import QrScanner from '$lib/components/qr-scanner.svelte';
  import {
    computeDashboardStats,
    computeEnhancedStats,
    distinctCategories,
    exportFilename,
    isManual,
    localOr,
    matchesFilters,
    parseReceiptUrl,
    toCsv,
    toJson,
    toPdf,
    useReceipts,
    type ExportFilters
  } from '$lib/receipts';
  import { formatCurrency, formatDate, formatDateTime, formatMonthLabel, formatPeriodLabel, slugCategory } from '$lib/utils/format';
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
  const store = useReceipts(() => data);

  const stats = $derived(computeDashboardStats(store.records));
  const enhancedStats = $derived(computeEnhancedStats(store.records, data.period));
  const exportCategories = $derived(distinctCategories(store.records));
  const filteredReceipts = $derived(
    store.records.filter((record) =>
      matchesFilters(record, { month: data.month, category: data.category })
    )
  );
  const ledgerCategories = $derived(distinctCategories(filteredReceipts));

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTotal = $derived(
    stats.monthlySpend.find((month) => month.month === currentMonth)?.total ?? 0
  );
  const maxPeriodTotal = $derived(
    enhancedStats.periodTotals.reduce((max, p) => Math.max(max, p.total), 0)
  );
  const maxCategoryTotal = $derived(
    stats.topCategories.reduce((max, c) => Math.max(max, c.total), 0)
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
    const matching = store.records.filter((record) => matchesFilters(record, filters));
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

  const exportPreview = $derived.by(() => {
    const filters = buildExportFilters();
    const matching = store.records.filter((record) => matchesFilters(record, filters));
    const limited = filters.limit ? Math.min(filters.limit, matching.length) : matching.length;
    return { total: matching.length, limited };
  });

  function previewLabel(): string {
    if (exportPreview.total === exportPreview.limited) {
      return `${exportPreview.total} receipt${exportPreview.total === 1 ? '' : 's'} ready`;
    }
    return `${exportPreview.total} match, exporting ${exportPreview.limited}`;
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
  <AppHeader user={data.user}>
    {#snippet leading()}
      {#if stats.receiptCount > 0}
        <div class="status-note">{stats.receiptCount} {stats.receiptCount === 1 ? 'receipt' : 'receipts'}</div>
      {/if}
    {/snippet}
  </AppHeader>

  <div class="dashboard stack">
    {#if data.user?.kind === 'remote' && !data.user.twoFactorEnabled}
      <div class="alert compact">
        Two-factor authentication is off. <a href="/settings/security">Set it up now</a> before adding more data.
      </div>
    {/if}

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

    {#if store.records.length === 0}
      <section class="empty-hero">
        <svg class="empty-art" viewBox="0 0 140 160" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M36 20 H104 V134 L96 126 L88 134 L80 126 L72 134 L64 126 L56 134 L48 126 L40 134 L36 126 Z" />
          <path d="M46 40 H94" stroke-dasharray="2 4" opacity="0.7" />
          <path d="M46 52 H88" stroke-dasharray="2 4" opacity="0.7" />
          <path d="M46 64 H92" stroke-dasharray="2 4" opacity="0.7" />
          <circle cx="58" cy="92" r="2" fill="currentColor" stroke="none" />
          <circle cx="82" cy="92" r="2" fill="currentColor" stroke="none" />
          <path d="M58 104 Q70 110 82 104" />
        </svg>
        <h2 class="empty-hero-title">Your ledger is empty — and that's fine.</h2>
        <p class="empty-hero-copy">
          {#if data.user?.kind === 'local'}
            Receipts you add live only in this browser. Paste a URL above, scan a QR, or jot one down by hand.
          {:else}
            Paste a receipt URL above, scan a QR, or jot one down by hand.
          {/if}
        </p>
      </section>
    {:else}
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
                  {#each exportCategories.filter((category) => category !== 'Unsorted') as category}
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

        {#if enhancedStats.periodTotals.length || stats.topCategories.length}
          <section class="summary-grid-stacked">
            <div class="summary-card">
              <div class="summary-label">Tracked spend</div>
              <div class="summary-value">{formatCurrency(stats.totalSpend)}</div>
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
            {#each enhancedStats.periodTotals.slice(0, 6) as entry}
              <div class="stat-row">
                <span class="stat-label">{formatPeriodLabel(enhancedStats.period, entry.period)}</span>
                <div class="stat-bar-track">
                  <div class="stat-bar-fill" style={`width:${maxPeriodTotal ? (entry.total / maxPeriodTotal) * 100 : 0}%`}></div>
                </div>
                <span class="stat-value">{formatCurrency(entry.total)}</span>
              </div>
            {/each}
          </div>

          {#if stats.topCategories.length}
            <div class="stats-group">
              <div class="stats-group-label">Categories</div>
              {#each stats.topCategories.slice(0, 4) as cat}
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
            {#each stats.monthlySpend.slice().reverse() as month}
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
            {#each ledgerCategories as category}
              <a
                class={`tab-link ${slugCategory(data.category) === slugCategory(category) ? 'active' : ''}`}
                href={`/?${new URLSearchParams({ ...(data.month ? { month: data.month } : {}), category: category === 'Unsorted' ? '__unsorted__' : category }).toString()}`}
              >
                {category}
              </a>
            {/each}
          </div>
        </div>

        <section class="panel">
          <div class="receipt-list">
            {#if filteredReceipts.length}
              {#each filteredReceipts as receipt}
                {@const manual = isManual(receipt)}
                <a class="receipt-row" href={`/receipts/${receipt.id}`}>
                  <div>
                     <h3 class="receipt-name">{receipt.merchantName}</h3>
                     <div class="meta-row detail-meta">
                       <span>{manual ? formatDate(receipt.urlDate) : formatDateTime(receipt.issuedAt)}</span>
                       <span>{slugCategory(receipt.category)}</span>
                       {#if !manual}
                         <span>ECC {receipt.eccId}</span>
                         <span>#{receipt.urlReceiptNumber}</span>
                       {/if}
                     </div>
                   </div>
                  <div class="amount">{formatCurrency(receipt.total)}</div>
                </a>
              {/each}
            {:else}
              <div class="empty-state">
                <svg class="empty-art empty-art-sm" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="34" cy="34" r="18" />
                  <path d="M47 47 L62 62" />
                  <path d="M28 34 H40" />
                </svg>
                <div class="empty-state-title">Nothing matches these filters</div>
                <div class="empty-state-copy">Try a different month or category, or clear the filters to see everything.</div>
              </div>
            {/if}
          </div>
        </section>
      </div>
    </div>
    {/if}
  </div>
</div>
