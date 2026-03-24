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

    <div class="auth-grid">
      <form method="POST" action="?/verifyTotp" class="panel panel-body stack-sm">
        <div class="stack-sm">
          <h2 class="panel-title">Authenticator code</h2>
          <p class="section-note">Enter the current 6-digit code.</p>
        </div>

        {#if form?.type === 'totp' && form?.message}
          <div class="alert error">{form.message}</div>
        {/if}

        <label class="field">
          <span class="label">Code</span>
          <input class="input" type="text" name="code" inputmode="numeric" autocomplete="one-time-code" required />
        </label>

        <label class="checkbox-row">
          <input type="checkbox" name="trust_device" />
          <span>Trust this device for 30 days</span>
        </label>

        <button class="button" type="submit">Verify code</button>
      </form>

      <form method="POST" action="?/verifyBackupCode" class="panel panel-body stack-sm">
        <div class="stack-sm">
          <h2 class="panel-title">Backup code</h2>
          <p class="section-note">Use a one-time recovery code if your authenticator is unavailable.</p>
        </div>

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

        <button class="button-secondary" type="submit">Use backup code</button>
      </form>
    </div>
  </section>
</div>
