<script lang="ts">
  import { goto } from '$app/navigation';
  import { startLocalSession } from '$lib/local-session';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const values = $derived((form && 'values' in form ? form.values : null) as
    | { email?: string }
    | null);

  function useLocal() {
    startLocalSession();
    goto('/', { invalidateAll: true });
  }
</script>

<svelte:head>
  <title>Sign In - Receipt Ledger</title>
</svelte:head>

<div class="auth-shell">
  <section class="auth-card stack">
    <div class="stack-sm">
      <div class="eyebrow">Receipt Ledger</div>
      <h1 class="auth-title">Sign in</h1>
      <p class="auth-copy">Use it locally in your browser, or sign in to the synced account.</p>
    </div>

    {#if data.hasRemoteBackend && !data.migrated}
      <div class="alert error">Run the auth migration before signing in.</div>
    {:else if data.authUnavailable}
      <div class="alert error">Authentication is temporarily unavailable.</div>
    {/if}

    {#if form?.message}
      <div class="alert error">{form.message}</div>
    {/if}

    <div class="stack-sm">
      <button class="button auth-submit" type="button" onclick={useLocal}>
        Use locally on this device
      </button>
      <p class="auth-copy">Receipts stay in this browser. Nothing leaves your device.</p>
    </div>

    {#if data.hasRemoteBackend}
      <div class="auth-divider">or sign in to the synced account</div>

      <form method="POST" class="stack">
        <label class="field">
          <span class="label">Email</span>
          <input class="input" type="email" name="email" value={values?.email ?? ''} required />
        </label>

        <label class="field">
          <span class="label">Password</span>
          <input class="input" type="password" name="password" autocomplete="current-password" required />
        </label>

        <button class="button-secondary auth-submit" type="submit">Sign in</button>
      </form>
    {/if}
  </section>
</div>
