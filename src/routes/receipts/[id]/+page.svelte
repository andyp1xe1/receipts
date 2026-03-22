<script lang="ts">
  import { formatCurrency, formatDateTime } from '$lib/utils/format';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const receipt = $derived(data.receipt);
</script>

<svelte:head>
  <title>{receipt.merchant_name} - Receipt Ledger</title>
  <meta name="description" content={`Receipt detail for ${receipt.merchant_name} on ${receipt.url_date}.`} />
</svelte:head>

<div class="app-shell">
  <header class="app-header">
    <div>
      <h1 class="app-title">Receipt Ledger</h1>
      <p class="app-subtitle">Receipt detail</p>
    </div>
    <div class="header-actions">
      <a class="button-ghost" href="/">Back to ledger</a>
    </div>
  </header>

  <div class="detail-shell">
    <main class="stack">
      <section class="panel">
        {#if data.created}
          <div class="alert success">Receipt imported and stored in D1.</div>
        {/if}

        {#if data.duplicate}
          <div class="alert success">This receipt already existed, so the saved copy was opened.</div>
        {/if}

        {#if form?.message}
          <div class={`alert ${form.type === 'error' ? 'error' : 'success'}`}>{form.message}</div>
        {/if}

        <div class="panel-body stack">
          <div class="detail-header">
            <div>
              <h2 class="detail-title">{receipt.merchant_name}</h2>
              <div class="meta-row detail-meta">
                <span>{formatDateTime(receipt.issued_at)}</span>
                <span>ECC {receipt.ecc_id}</span>
                <span>Receipt #{receipt.url_receipt_number}</span>
                <span>{receipt.url_date}</span>
              </div>
            </div>
            <div class="detail-total">{formatCurrency(receipt.total)}</div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Line items</h2>
        </div>
        <div class="panel-body">
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty x unit</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {#each receipt.parsed.items as item}
                <tr>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.quantity.toFixed(3)} x {item.unitPrice.toFixed(2)}</td>
                  <td>{formatCurrency(item.total)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <div class="two-column">
        <section class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Taxes</h2>
          </div>
          <div class="panel-body stack" style="gap: 10px;">
            {#if receipt.parsed.taxes.length}
              {#each receipt.parsed.taxes as tax}
                <div class="spaced">
                  <span>{tax.label}</span>
                  <strong>{formatCurrency(tax.amount)}</strong>
                </div>
              {/each}
            {:else}
              <div class="section-note">No explicit tax lines found.</div>
            {/if}
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Payments</h2>
          </div>
          <div class="panel-body stack" style="gap: 10px;">
            {#if receipt.parsed.payments.card !== null}
              <div class="spaced"><span>Card</span><strong>{formatCurrency(receipt.parsed.payments.card)}</strong></div>
            {/if}
            {#if receipt.parsed.payments.cashGiven !== null}
              <div class="spaced"><span>Cash given</span><strong>{formatCurrency(receipt.parsed.payments.cashGiven)}</strong></div>
            {/if}
            {#if receipt.parsed.payments.change !== null}
              <div class="spaced"><span>Change</span><strong>{formatCurrency(receipt.parsed.payments.change)}</strong></div>
            {/if}
            {#each Object.entries(receipt.parsed.payments.other) as [label, amount]}
              <div class="spaced"><span>{label}</span><strong>{formatCurrency(amount)}</strong></div>
            {/each}
          </div>
        </section>
      </div>
    </main>

    <aside class="stack">
      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Metadata</h2>
        </div>
        <form method="POST" action="?/save" class="panel-body stack">
          <label class="field">
            <span class="label">Category</span>
            <input class="input" type="text" name="category" value={receipt.category ?? ''} />
          </label>

          <label class="field">
            <span class="label">Note</span>
            <textarea class="textarea" name="note">{receipt.note ?? ''}</textarea>
          </label>

          <div class="button-row">
            <button class="button" type="submit">Save changes</button>
          </div>
        </form>
        <div class="panel-body" style="padding-top: 0;">
          <form method="POST" action="?/delete">
            <button class="button-secondary" type="submit">Delete receipt</button>
          </form>
        </div>
      </section>

      <section class="panel panel-muted">
        <div class="panel-header">
          <h2 class="panel-title">Canonical identity</h2>
        </div>
        <div class="panel-body stack" style="gap: 10px;">
          <div class="meta-grid">
            <div class="meta-label">Source URL</div>
            <div class="meta-value">{receipt.source_url}</div>
          </div>
          <div class="meta-grid">
            <div class="meta-label">ECC</div>
            <div class="meta-value">{receipt.ecc_id}</div>
          </div>
          <div class="meta-grid">
            <div class="meta-label">URL total</div>
            <div class="meta-value">{receipt.url_total}</div>
          </div>
          <div class="meta-grid">
            <div class="meta-label">Receipt number</div>
            <div class="meta-value">{receipt.url_receipt_number}</div>
          </div>
          <div class="meta-grid">
            <div class="meta-label">Date</div>
            <div class="meta-value">{receipt.url_date}</div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">ASCII receipt</h2>
        </div>
        <div class="panel-body">
          <pre class="ascii">{receipt.parsed.asciiReceipt}</pre>
        </div>
      </section>
    </aside>
  </div>
</div>
