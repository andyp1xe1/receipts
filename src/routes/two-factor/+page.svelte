<script lang="ts">
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
  <title>Two-Factor Check - Receipt Ledger</title>
</svelte:head>

<div class="auth-shell">
  <section class="auth-card stack">
    <div class="stack-sm">
      <div class="eyebrow">Second factor</div>
      <h1 class="auth-title">Finish signing in</h1>
      <p class="auth-copy">Use your authenticator app or one of your backup codes.</p>
    </div>

    <form method="POST" action="?/verifyTotp" class="stack-sm">
      {#if form?.type === 'totp' && form?.message}
        <div class="alert error">{form.message}</div>
      {/if}

      <label class="field">
        <span class="label">Authenticator code</span>
        <input class="input" type="text" name="code" inputmode="numeric" autocomplete="one-time-code" required />
      </label>

      <label class="checkbox-row">
        <input type="checkbox" name="trust_device" />
        <span>Trust this device for 30 days</span>
      </label>

      <button class="button auth-submit" type="submit">Verify code</button>
    </form>

    <details class="backup-details">
      <summary class="backup-summary">Use a backup code instead</summary>
      <form method="POST" action="?/verifyBackupCode" class="stack-sm backup-form">
        {#if form?.type === 'backup' && form?.message}
          <div class="alert error">{form.message}</div>
        {/if}

        <label class="field">
          <span class="label">Backup code</span>
          <input class="input" type="text" name="backup_code" autocomplete="off" required />
        </label>

        <label class="checkbox-row">
          <input type="checkbox" name="backup_trust_device" />
          <span>Trust this device for 30 days</span>
        </label>

        <button class="button-secondary auth-submit" type="submit">Use backup code</button>
      </form>
    </details>
  </section>
</div>
