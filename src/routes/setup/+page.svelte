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
    <div class="stack-sm">
      <div class="eyebrow">First run</div>
      <h1 class="auth-title">Create the admin account</h1>
      <p class="auth-copy">Receipt Ledger stays private and single-user by default.</p>
    </div>

    {#if !data.migrated}
      <div class="alert error">
        Auth tables are missing. Run `bun run db:migrate:local` for local dev, then refresh this page.
      </div>
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

      <button class="button auth-submit" type="submit" disabled={!data.migrated || !data.setupTokenConfigured}>
        Create account
      </button>
    </form>

    <a class="auth-copy" href="/login">Back to sign in</a>
  </section>
</div>
