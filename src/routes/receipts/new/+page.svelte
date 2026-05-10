<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import AppHeader from '$lib/components/app-header.svelte';
  import * as localStore from '$lib/local-store';
  import { formField, localOr, synthesizeNewReceipt } from '$lib/receipts';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const today = new Date().toISOString().slice(0, 10);
  const formValues = $derived(
    (form && 'values' in form ? (form.values as Record<string, string>) : null) ?? null
  );
  const initialMerchant = $derived(formValues?.merchantName ?? '');
  const initialTotal = $derived(formValues?.total ?? data.prefill?.urlTotal ?? '');
  const initialDate = $derived(formValues?.urlDate ?? data.prefill?.urlDate ?? today);
  const initialCategory = $derived(formValues?.category ?? '');
  const initialNote = $derived(formValues?.note ?? '');

  let localError = $state<string | null>(null);

  function handleLocal(formData: FormData) {
    const input = {
      merchantName: formField(formData, 'merchant_name'),
      total: formField(formData, 'total'),
      urlDate: formField(formData, 'url_date'),
      sourceUrl: formField(formData, 'source_url') || undefined
    };

    if (!input.merchantName || !input.total || !input.urlDate) {
      localError = 'Merchant, date and total are required.';
      return;
    }

    const parsed = synthesizeNewReceipt(input);
    const existing = localStore.findByCanonicalKey(parsed);
    if (existing) {
      goto(`/receipts/${existing.id}?duplicate=1`, { invalidateAll: true });
      return;
    }

    const id = localStore.create(parsed, {
      category: formField(formData, 'category') || null,
      note: formField(formData, 'note') || null
    });
    goto(`/receipts/${id}?created=1`, { invalidateAll: true });
  }

  const flash = $derived(localError ? { type: 'error' as const, message: localError } : form);
</script>

<svelte:head>
  <title>New receipt - Receipt Ledger</title>
</svelte:head>

<div class="app-shell">
  <AppHeader user={data.user} back showSecurity={false} showSignOut={false} />

  <div class="dashboard stack">
    <section class="panel">
      <div class="panel-header">
        <h2 class="panel-title">Add a receipt</h2>
      </div>

      <form
        method="POST"
        action="?/save"
        class="panel-body stack"
        use:enhance={localOr(data, (formData) => {
          localError = null;
          handleLocal(formData);
        })}
      >
        {#if flash?.message}
          <div class={`alert compact ${flash.type === 'error' ? 'error' : 'success'}`}>{flash.message}</div>
        {/if}

        {#if data.prefill}
          <div class="alert compact">Prefilled from receipt URL — fill in the merchant and any extras.</div>
          <input type="hidden" name="source_url" value={data.prefill.sourceUrl} />
        {/if}

        <label class="field">
          <span class="label">Merchant</span>
          <input class="input" type="text" name="merchant_name" value={initialMerchant} required />
        </label>

        <div class="two-column">
          <label class="field">
            <span class="label">Date</span>
            <input class="input" type="date" name="url_date" value={initialDate} required />
          </label>

          <label class="field">
            <span class="label">Total (MDL)</span>
            <input class="input" type="number" step="0.01" name="total" value={initialTotal} required />
          </label>
        </div>

        <label class="field">
          <span class="label">Category</span>
          <input class="input" type="text" name="category" value={initialCategory} />
        </label>

        <label class="field">
          <span class="label">Note</span>
          <textarea class="textarea" name="note">{initialNote}</textarea>
        </label>

        <div class="button-row">
          <button class="button" type="submit">Save receipt</button>
        </div>
      </form>
    </section>
  </div>
</div>
