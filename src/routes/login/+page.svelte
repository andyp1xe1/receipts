<script lang="ts">
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const values = $derived((form && 'values' in form ? form.values : null) as
    | { email?: string }
    | null);
</script>

<svelte:head>
  <title>Sign In - Receipt Ledger</title>
</svelte:head>

<div class="auth-shell">
  <section class="auth-card stack">
    <div class="stack-sm">
      <div class="eyebrow">Private ledger</div>
      <h1 class="auth-title">Sign in</h1>
      <p class="auth-copy">Use the admin account for this self-hosted instance.</p>
    </div>

    {#if !data.migrated}
      <div class="alert error">Run the auth migration before signing in.</div>
    {:else if data.authUnavailable}
      <div class="alert error">Authentication is temporarily unavailable.</div>
    {/if}

    {#if form?.message}
      <div class="alert error">{form.message}</div>
    {/if}

    <form method="POST" class="stack">
      <label class="field">
        <span class="label">Email</span>
        <input class="input" type="email" name="email" value={values?.email ?? ''} required />
      </label>

      <label class="field">
        <span class="label">Password</span>
        <input class="input" type="password" name="password" autocomplete="current-password" required />
      </label>

      <button class="button auth-submit" type="submit">Sign in</button>
    </form>
  </section>
</div>
