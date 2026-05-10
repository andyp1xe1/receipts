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

    {#if data.authUnavailable}
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

    {#if data.remoteReady}
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
    {:else if data.needsAdmin}
      <div class="auth-divider">or set up the synced account</div>
      <a class="button-secondary auth-submit" href="/setup">Create the admin account</a>
    {:else if data.needsMigration}
      <div class="auth-divider">synced account not available yet</div>
      <p class="auth-copy">Run the auth migration before the synced backend is ready.</p>
    {/if}
  </section>
</div>
