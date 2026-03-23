<script lang="ts">
  import QrScanner from '$lib/components/qr-scanner.svelte';
  import { formatCurrency, formatMonthLabel, formatDateTime, slugCategory } from '$lib/utils/format';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let sourceUrl = $state('');
  let appliedForm = $state<ActionData | null>(null);
  let sourceInput: HTMLInputElement | null = null;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTotal = $derived(
    data.stats.monthlySpend.find((month) => month.month === currentMonth)?.total ?? 0
  );
  const maxMonthlyTotal = $derived.by(() =>
    data.stats.monthlySpend.reduce((max, m) => Math.max(max, m.total), 0)
  );
  const maxCategoryTotal = $derived.by(() =>
    data.stats.topCategories.reduce((max, c) => Math.max(max, c.total), 0)
  );

  $effect(() => {
    if (!form || form === appliedForm) return;
    const values = 'values' in form ? (form.values as Record<string, string | undefined>) : null;
    sourceUrl = values?.source_url ?? '';
    appliedForm = form;
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
    <div class="header-actions"><div class="status-note">{data.stats.receiptCount} receipts</div></div>
  </header>

  <div class="dashboard stack">
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
    {#if data.stats.monthlySpend.length || data.stats.topCategories.length}
      <div class="stats-strip">
        {#if data.stats.monthlySpend.length}
          <div class="stats-group">
            <div class="stats-group-label">Monthly</div>
            {#each data.stats.monthlySpend.slice(-4).reverse() as month}
              <div class="stat-row">
                <span class="stat-label">{formatMonthLabel(month.month)}</span>
                <div class="stat-bar-track">
                  <div class="stat-bar-fill" style={`width:${maxMonthlyTotal ? (month.total / maxMonthlyTotal) * 100 : 0}%`}></div>
                </div>
                <span class="stat-value">{formatCurrency(month.total)}</span>
              </div>
            {/each}
          </div>
        {/if}
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

    <!-- Ledger -->
    <section class="panel">
      <div class="receipt-list">
        {#if data.receipts.length}
          {#each data.receipts as receipt}
            <a class="receipt-row" href={`/receipts/${receipt.id}`}>
              <div>
                <h3 class="receipt-name">{receipt.merchant_name}</h3>
                <div class="meta-row detail-meta">
                  <span>{formatDateTime(receipt.issued_at)}</span>
                  <span>{receipt.category || 'Unsorted'}</span>
                  <span>ECC {receipt.ecc_id}</span>
                  <span>#{receipt.url_receipt_number}</span>
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
