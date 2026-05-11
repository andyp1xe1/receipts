<script lang="ts">
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const values = $derived((form && 'values' in form ? form.values : null) as
    | { name?: string; email?: string }
    | null);
</script>

<svelte:head>
  <title>Set Up - Receipt Ledger</title>
</svelte:head>

<div class="auth-shell">
  <section class="auth-card stack">
    <div class="auth-empty auth-empty-top">
      <svg class="empty-art" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M60 18 L66 50 L98 56 L66 62 L60 94 L54 62 L22 56 L54 50 Z" />
        <path d="M92 26 L94 32 L100 34 L94 36 L92 42 L90 36 L84 34 L90 32 Z" fill="currentColor" stroke="none" opacity="0.55" />
        <path d="M26 80 L27 84 L31 85 L27 86 L26 90 L25 86 L21 85 L25 84 Z" fill="currentColor" stroke="none" opacity="0.55" />
      </svg>
    </div>
    <div class="stack-sm">
      <div class="eyebrow">First run</div>
      <h1 class="auth-title">Create the admin account</h1>
      <p class="auth-copy">A fresh ledger, waiting for its first keeper. Receipt Ledger stays private and single-user by default.</p>
    </div>

    {#if !data.migrated}
      <div class="alert error">
        Auth tables are missing. Run `bun run db:migrate:local` for local dev, then refresh this page.
      </div>
    {:else if !data.authSecretConfigured}
      <div class="alert error">Set `BETTER_AUTH_SECRET` on the worker before creating the first account.</div>
    {:else if !data.setupTokenConfigured}
      <div class="alert error">Set `SETUP_TOKEN` before creating the first admin account.</div>
    {:else if data.migrateHint}
      <div class="alert compact">Finish first-run setup to unlock the ledger.</div>
    {/if}

    {#if form?.message}
      <div class="alert error">{form.message}</div>
    {/if}

    <form method="POST" class="stack">
      <label class="field">
        <span class="label">Name</span>
        <input class="input" type="text" name="name" value={values?.name ?? ''} required />
      </label>

      <label class="field">
        <span class="label">Email</span>
        <input class="input" type="email" name="email" value={values?.email ?? ''} required />
      </label>

      <label class="field">
        <span class="label">Password</span>
        <input class="input" type="password" name="password" autocomplete="new-password" minlength="12" required />
      </label>

      <label class="field">
        <span class="label">Setup token</span>
        <input class="input" type="password" name="setup_token" autocomplete="one-time-code" required />
      </label>

      <button class="button auth-submit" type="submit" disabled={!data.migrated || !data.setupTokenConfigured || !data.authSecretConfigured}>
        Create account
      </button>
    </form>

    <a class="auth-copy" href="/login">Back to sign in</a>
  </section>
</div>
