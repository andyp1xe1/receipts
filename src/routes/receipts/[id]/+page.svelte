<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import * as localStore from '$lib/local-store';
  import { formField, localOr, useReceipt } from '$lib/receipts';
  import { formatCurrency, formatDateTime } from '$lib/utils/format';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const view = useReceipt(() => data, () => data.id);
  const receipt = $derived(view.receipt);

  let localFlash = $state<{ type: 'success' | 'error'; message: string } | null>(null);

  $effect(() => {
    if (view.kind === 'local' && receipt === null) goto('/');
  });

  function handleLocalSave(formData: FormData) {
    localStore.updateMetadata(data.id, {
      category: formField(formData, 'category') || null,
      note: formField(formData, 'note') || null
    });
    view.refresh();
    localFlash = { type: 'success', message: 'Metadata saved.' };
  }

  function handleLocalDelete(_: FormData) {
    localStore.remove(data.id);
    goto('/', { invalidateAll: true });
  }

  const flash = $derived(localFlash ?? (form ? { type: form.type, message: form.message } : null));
</script>

<svelte:head>
  <title>{receipt?.merchantName ?? 'Receipt'} - Receipt Ledger</title>
  <meta name="description" content={`Receipt detail${receipt ? ` for ${receipt.merchantName}` : ''}.`} />
</svelte:head>

<div class="app-shell">
  <header class="app-header">
    <h1 class="app-title">Receipt Ledger</h1>
    <div class="header-actions">
      <a class="button-ghost" href="/">Back to ledger</a>
      {#if view.kind === 'remote'}
        <a class="button-ghost" href="/settings/security">Security</a>
      {/if}
      <form method="POST" action="/?/logout">
        <button class="button-ghost" type="submit">Sign out</button>
      </form>
    </div>
  </header>

  {#if !receipt}
    <div class="detail-shell">
      <main class="stack">
        <div class="empty-state">Loading receipt…</div>
      </main>
    </div>
  {:else}
    <div class="detail-shell">
      <main class="stack">
        {#if data.created}
          <div class="alert compact success">Receipt imported and stored.</div>
        {/if}

        {#if data.duplicate}
          <div class="alert compact success">This receipt already existed — opened the saved copy.</div>
        {/if}

        {#if flash?.message}
          <div class={`alert compact ${flash.type === 'error' ? 'error' : 'success'}`}>{flash.message}</div>
        {/if}

        <section class="panel">
          <div class="panel-body">
            <div class="detail-header">
              <div>
                <h2 class="detail-title">{receipt.merchantName}</h2>
                <div class="meta-row detail-meta">
                  <span>{formatDateTime(receipt.issuedAt)}</span>
                  <span>ECC {receipt.eccId}</span>
                  <span>Receipt #{receipt.urlReceiptNumber}</span>
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
          <div class="compact-section">
            <strong>Taxes</strong>
            {#if receipt.parsed.taxes.length}
              {#each receipt.parsed.taxes as tax}
                <div class="spaced">
                  <span>{tax.label}</span>
                  <strong>{formatCurrency(tax.amount)}</strong>
                </div>
              {/each}
            {:else}
              <div class="muted">No explicit tax lines.</div>
            {/if}
          </div>

          <div class="compact-section">
            <strong>Payments</strong>
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
        </div>

        <div class="detail-bottom-row">
          <section class="panel">
            <div class="panel-header">
              <h3 class="panel-title">Source details</h3>
            </div>
            <div class="panel-body stack-sm">
              <div class="meta-grid">
                <div class="meta-label">Source URL</div>
                <div class="meta-value">{receipt.sourceUrl}</div>
              </div>
              <div class="meta-grid">
                <div class="meta-label">ECC</div>
                <div class="meta-value">{receipt.eccId}</div>
              </div>
              <div class="meta-grid">
                <div class="meta-label">URL total</div>
                <div class="meta-value">{receipt.urlTotal}</div>
              </div>
              <div class="meta-grid">
                <div class="meta-label">Receipt number</div>
                <div class="meta-value">{receipt.urlReceiptNumber}</div>
              </div>
              <div class="meta-grid">
                <div class="meta-label">Date</div>
                <div class="meta-value">{receipt.urlDate}</div>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <h3 class="panel-title">Raw receipt</h3>
            </div>
            <div class="panel-body ascii-body">
              <pre class="ascii">{receipt.parsed.asciiReceipt}</pre>
            </div>
          </section>
        </div>
      </main>

      <aside class="stack">
        <section class="panel">
          <form
            method="POST"
            action="?/save"
            class="panel-body stack"
            use:enhance={localOr(data, handleLocalSave)}
          >
            <label class="field">
              <span class="label">Category</span>
              <input class="input" type="text" name="category" value={receipt.category ?? ''} />
            </label>

            <label class="field">
              <span class="label">Note</span>
              <textarea class="textarea" name="note" value={receipt.note ?? ''}></textarea>
            </label>

            <div class="button-row">
              <button class="button" type="submit">Save changes</button>
            </div>
          </form>
          <form
            method="POST"
            action="?/delete"
            class="panel-body"
            style="padding-top: 0;"
            onsubmit={(e) => { if (!confirm('Delete this receipt permanently?')) e.preventDefault(); }}
            use:enhance={localOr(data, handleLocalDelete)}
          >
            <button class="button-danger" type="submit">Delete</button>
          </form>
        </section>
      </aside>
    </div>
  {/if}
</div>
