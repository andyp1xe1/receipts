<script lang="ts">
  import QrScanner from '$lib/components/qr-scanner.svelte';
  import { formatCurrency, formatMonthLabel, formatDateTime, slugCategory } from '$lib/utils/format';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let sourceUrl = $state('');
  let category = $state('');
  let note = $state('');
  let appliedForm = $state<ActionData | null>(null);
  let sourceInput: HTMLInputElement | null = null;

  const maxMonthlyTotal = $derived.by(() =>
    data.stats.monthlySpend.reduce((max, month) => Math.max(max, month.total), 0)
  );
  const maxCategoryTotal = $derived.by(() =>
    data.stats.topCategories.reduce((max, category) => Math.max(max, category.total), 0)
  );
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTotal = $derived(
    data.stats.monthlySpend.find((month) => month.month === currentMonth)?.total ?? 0
  );

  $effect(() => {
    if (!form || form === appliedForm) return;
    sourceUrl = form.values?.source_url ?? '';
    category = form.values?.category ?? '';
    note = form.values?.note ?? '';
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
    <div>
      <h1 class="app-title">Receipt Ledger</h1>
      <p class="app-subtitle">Save receipts, categorize expenses, and find them later.</p>
    </div>
    <div class="header-actions"><div class="status-note">{data.stats.receiptCount} receipts</div></div>
  </header>

  <div class="layout-grid">
    <aside class="stack">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Import receipt</h2>
            <div class="section-note">Use a scanned MEV URL.</div>
          </div>
        </div>

        {#if form?.message}
          <div class={`alert ${form.type === 'error' ? 'error' : 'success'}`}>{form.message}</div>
        {/if}

        <form method="POST" action="?/ingest" class="panel-body stack">
          <label class="field">
            <span class="label">Receipt URL</span>
            <input
              bind:this={sourceInput}
              bind:value={sourceUrl}
              class="input"
              type="url"
              name="source_url"
              placeholder="Paste a receipt URL"
              required
            />
          </label>

          <div class="field">
            <span class="label">QR scanner</span>
            <QrScanner onscan={handleScannerResult} />
          </div>

          <label class="field">
            <span class="label">Category</span>
            <input
              bind:value={category}
              class="input"
              type="text"
              name="category"
              placeholder="Groceries"
            />
          </label>

          <label class="field">
            <span class="label">Note</span>
            <textarea bind:value={note} class="textarea" name="note" placeholder="Optional note"></textarea>
          </label>

          <div class="button-row">
            <button class="button" type="submit">Parse and save</button>
          </div>
        </form>
      </section>

      <section class="panel panel-muted">
        <div class="panel-header">
          <h2 class="panel-title">Filters</h2>
        </div>
        <div class="panel-body stack">
          <div class="stack" style="gap: 8px;">
            <div class="label">Months</div>
            <div class="tab-row">
              <a class={`tab-link ${!data.month ? 'active' : ''}`} href="/">All</a>
              {#each data.stats.monthlySpend.slice().reverse() as month}
                <a class={`tab-link ${data.month === month.month ? 'active' : ''}`} href={`/?month=${month.month}`}>
                  {formatMonthLabel(month.month)}
                </a>
              {/each}
            </div>
          </div>

          <div class="stack" style="gap: 8px;">
            <div class="label">Categories</div>
            <div class="tab-row">
              <a class={`tab-link ${!data.category ? 'active' : ''}`} href={data.month ? `/?month=${data.month}` : '/'}>
                All
              </a>
              {#each data.categories as category}
                <a
                  class={`tab-link ${slugCategory(data.category) === slugCategory(category) ? 'active' : ''}`}
                  href={`/?${new URLSearchParams({ ...(data.month ? { month: data.month } : {}), category: category === 'Unsorted' ? '__unsorted__' : category }).toString()}`}
                >
                  {category}
                </a>
              {/each}
            </div>
          </div>
        </div>
      </section>
    </aside>

    <main class="stack">
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

      <section class="panel">
        <div class="toolbar">
          <div>
            <h2 class="panel-title">Overview</h2>
            <div class="section-note">Monthly totals and category totals from saved receipts.</div>
          </div>
        </div>

        <div class="panel-body two-column">
          <div class="stack" style="gap: 12px;">
            <h3 class="section-title">Monthly spend</h3>
            {#if data.stats.monthlySpend.length}
              <div class="data-list">
                {#each data.stats.monthlySpend as month}
                  <div class="list-row">
                    <div class="data-row">
                      <strong>{formatMonthLabel(month.month)}</strong>
                      <span class="table-meta">{formatCurrency(month.total)} · {month.count}</span>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" style={`width:${maxMonthlyTotal ? (month.total / maxMonthlyTotal) * 100 : 0}%`}></div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="section-note">No receipts yet.</div>
            {/if}
          </div>

          <div class="stack" style="gap: 12px;">
            <h3 class="section-title">Categories</h3>
            {#if data.stats.topCategories.length}
              <div class="data-list">
                {#each data.stats.topCategories as category}
                  <div class="list-row">
                    <div class="data-row">
                      <strong>{category.category}</strong>
                      <span class="table-meta">{formatCurrency(category.total)} · {category.count}</span>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" style={`width:${maxCategoryTotal ? (category.total / maxCategoryTotal) * 100 : 0}%`}></div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="section-note">Add categories while importing to group expenses.</div>
            {/if}
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="toolbar">
          <div>
            <h2 class="panel-title">Ledger</h2>
            <div class="section-note">Open any receipt to inspect items, taxes, payments, and metadata.</div>
          </div>
        </div>

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
                  <div class="receipt-supporting">{receipt.note || receipt.parsed.items[0]?.name || 'Open receipt'}</div>
                </div>
                <div class="amount">{formatCurrency(receipt.total)}</div>
              </a>
            {/each}
          {:else}
            <div class="empty-state">Paste your first MEV URL to start the ledger.</div>
          {/if}
        </div>
      </section>
    </main>
  </div>
</div>
