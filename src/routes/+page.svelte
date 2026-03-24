<script lang="ts">
  import { browser } from '$app/environment';
  import QrScanner from '$lib/components/qr-scanner.svelte';
  import { formatCurrency, formatMonthLabel, formatDateTime, formatPeriodLabel, slugCategory } from '$lib/utils/format';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  type ExportScope = 'current' | 'all' | 'custom';

  let sourceUrl = $state('');
  let appliedForm = $state<ActionData | null>(null);
  let sourceInput: HTMLInputElement | null = null;
  let exportScope = $state<ExportScope>('all');
  let exportFrom = $state('');
  let exportTo = $state('');
  let exportCategory = $state('');
  let exportLimit = $state('all');
  let exportPreviewTotal = $state(0);
  let exportPreviewLimited = $state(0);
  let exportPreviewLoading = $state(false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTotal = $derived(
    data.stats.monthlySpend.find((month) => month.month === currentMonth)?.total ?? 0
  );
  const maxPeriodTotal = $derived.by(() =>
    data.enhancedStats.periodTotals.reduce((max, p) => Math.max(max, p.total), 0)
  );
  const maxCategoryTotal = $derived.by(() =>
    data.stats.topCategories.reduce((max, c) => Math.max(max, c.total), 0)
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

  function exportUrl(format: string, overrides: { pdfMode?: 'compact' | 'full' } = {}): string {
    const params = exportParams(overrides);
    const qs = params.toString();
    return `/api/export/${format}${qs ? `?${qs}` : ''}`;
  }

  function exportParams(overrides: { pdfMode?: 'compact' | 'full' } = {}): URLSearchParams {
    const params = new URLSearchParams();

    if (exportScope === 'current') {
      if (data.month) params.set('month', data.month);
      if (data.category) params.set('category', data.category);
    }

    if (exportScope === 'custom') {
      if (exportFrom) params.set('from', exportFrom);
      if (exportTo) params.set('to', exportTo);
      if (exportCategory) params.set('category', exportCategory);
    }

    if (exportLimit !== 'all') params.set('limit', exportLimit);
    if (overrides.pdfMode === 'full') params.set('pdf_mode', 'full');

    return params;
  }

  function currentFiltersLabel(): string {
    const parts: string[] = [];
    if (data.month) parts.push(formatMonthLabel(data.month));
    if (data.category) parts.push(data.category === '__unsorted__' ? 'Unsorted' : data.category);
    return parts.length ? parts.join(' - ') : 'No page filters';
  }

  function previewLabel(): string {
    if (exportPreviewLoading) return 'Checking receipts...';
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
    exportPreviewTotal = data.receipts.length;
    exportPreviewLimited = data.receipts.length;
    exportPreviewLoading = false;
  });

  $effect(() => {
    if (!browser) return;

    const controller = new AbortController();
    const params = exportParams();
    exportPreviewLoading = true;

    window.fetch(`/api/export/preview?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Preview failed');
        const payload = (await response.json()) as { total: number; limited: number };
        exportPreviewTotal = payload.total;
        exportPreviewLimited = payload.limited;
        exportPreviewLoading = false;
      })
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        exportPreviewTotal = 0;
        exportPreviewLimited = 0;
        exportPreviewLoading = false;
      });

    return () => controller.abort();
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
    content="Paste Moldova MEV receipt URLs, capture them in D1, and review your expense history from one tidy ledger."
  />
</svelte:head>

<div class="app-shell">
  <header class="app-header">
    <h1 class="app-title">Receipt Ledger</h1>
    <div class="header-actions">
      <div class="status-note">{data.stats.receiptCount} receipts</div>
      {#if data.user}
        <a class="button-ghost" href="/settings/security">Security</a>
        <form method="POST" action="/logout">
          <button class="button-ghost" type="submit">Sign out</button>
        </form>
      {/if}
    </div>
  </header>

  <div class="dashboard stack">
    {#if data.user && !data.user.twoFactorEnabled}
      <div class="alert compact">
        Two-factor authentication is off. <a href="/settings/security">Set it up now</a> before adding more data.
      </div>
    {/if}

    <!-- Import bar -->
    <form method="POST" action="?/ingest" class="import-bar">
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
    </form>

    {#if form?.message}
      <div class={`alert compact ${form.type === 'error' ? 'error' : 'success'}`}>{form.message}</div>
    {/if}

    <!-- Summary cards -->
    <section class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Saved receipts</div>
        <div class="summary-value">{data.stats.receiptCount}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Tracked spend</div>
        <div class="summary-value">{formatCurrency(data.stats.totalSpend)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">This month</div>
        <div class="summary-value">{formatCurrency(currentMonthTotal)}</div>
      </div>
    </section>

    <!-- Stats strip -->
    {#if data.enhancedStats.periodTotals.length || data.stats.topCategories.length}
      <div class="stats-strip">
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
          {#each data.enhancedStats.periodTotals.slice(0, 6) as entry}
            <div class="stat-row">
              <span class="stat-label">{formatPeriodLabel(data.enhancedStats.period, entry.period)}</span>
              <div class="stat-bar-track">
                <div class="stat-bar-fill" style={`width:${maxPeriodTotal ? (entry.total / maxPeriodTotal) * 100 : 0}%`}></div>
              </div>
              <span class="stat-value">{formatCurrency(entry.total)}</span>
            </div>
          {/each}
        </div>
        {#if data.stats.topCategories.length}
          <div class="stats-group">
            <div class="stats-group-label">Categories</div>
            {#each data.stats.topCategories.slice(0, 4) as cat}
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
      </div>
    {/if}

    <!-- Inline filters -->
    <div class="filter-row">
      <a
        class={`tab-link ${!data.month ? 'active' : ''}`}
        href={data.category ? `/?${new URLSearchParams({ category: data.category }).toString()}` : '/'}
      >
        All
      </a>
      {#each data.stats.monthlySpend.slice().reverse() as month}
        <a
          class={`tab-link ${data.month === month.month ? 'active' : ''}`}
          href={`/?${new URLSearchParams({ month: month.month, ...(data.category ? { category: data.category } : {}) }).toString()}`}
        >
          {formatMonthLabel(month.month)}
        </a>
      {/each}

      <span class="filter-divider"></span>

      <a class={`tab-link ${!data.category ? 'active' : ''}`} href={data.month ? `/?month=${data.month}` : '/'}>All</a>
      {#each data.categories as category}
        <a
          class={`tab-link ${slugCategory(data.category) === slugCategory(category) ? 'active' : ''}`}
          href={`/?${new URLSearchParams({ ...(data.month ? { month: data.month } : {}), category: category === 'Unsorted' ? '__unsorted__' : category }).toString()}`}
        >
          {category}
        </a>
      {/each}
    </div>

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
              {#each data.exportCategories.filter((category) => category !== 'Unsorted') as category}
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
          <a class="button-secondary export-link" href={exportUrl('csv')}>Download CSV</a>
          <a class="button-secondary export-link" href={exportUrl('json')}>Download full JSON</a>
          <a class="button-secondary export-link" href={exportUrl('pdf')}>Download PDF compact</a>
          <a class="button-secondary export-link" href={exportUrl('pdf', { pdfMode: 'full' })}>Download PDF full</a>
        </div>
      </div>
    </details>

    <!-- Ledger -->
    <section class="panel">
      <div class="receipt-list">
        {#if data.receipts.length}
          {#each data.receipts as receipt}
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
