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

    {#if !data.authSecretConfigured && data.hasRemoteBackend}
      <div class="alert error">
        Set <code>BETTER_AUTH_SECRET</code> on the deployed worker, then refresh this page.
      </div>
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
      <div class="auth-empty">
        <svg class="empty-art empty-art-sm" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M60 22 L66 52 L96 58 L66 64 L60 94 L54 64 L24 58 L54 52 Z" />
          <path d="M92 28 L94 34 L100 36 L94 38 L92 44 L90 38 L84 36 L90 34 Z" fill="currentColor" stroke="none" opacity="0.55" />
          <path d="M28 80 L29 84 L33 85 L29 86 L28 90 L27 86 L23 85 L27 84 Z" fill="currentColor" stroke="none" opacity="0.55" />
        </svg>
        <p class="auth-copy">Nobody's signed up yet — be the first.</p>
      </div>
      <a class="button-secondary auth-submit" href="/setup">Create the admin account</a>
    {:else if data.needsMigration}
      <div class="auth-divider">synced account not available yet</div>
      <div class="auth-empty">
        <svg class="empty-art" viewBox="0 0 140 160" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M36 20 H104 V134 L96 126 L88 134 L80 126 L72 134 L64 126 L56 134 L48 126 L40 134 L36 126 Z" />
          <path d="M46 40 H94" stroke-dasharray="2 4" opacity="0.7" />
          <path d="M46 52 H88" stroke-dasharray="2 4" opacity="0.7" />
          <path d="M48 92 Q53 89 58 92" />
          <path d="M66 92 Q71 89 76 92" />
          <path d="M54 104 H72" />
          <path d="M108 56 H120 L108 70 H120" />
          <path d="M120 38 H128 L120 48 H128" opacity="0.6" />
        </svg>
        <p class="auth-copy">The synced backend is still snoozing. Run the auth migration to wake it up.</p>
      </div>
    {/if}
  </section>
</div>
