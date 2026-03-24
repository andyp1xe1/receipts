<script lang="ts">
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
  <title>Security - Receipt Ledger</title>
</svelte:head>

<div class="app-shell">
  <header class="app-header">
    <h1 class="app-title">Security</h1>
    <div class="header-actions">
      <a class="button-ghost" href="/">Back to ledger</a>
      <form method="POST" action="/logout">
        <button class="button-ghost" type="submit">Sign out</button>
      </form>
    </div>
  </header>

  <div class="stack" style="padding-top: 16px;">
    {#if data.welcome}
      <div class="alert compact">Your account is ready. Next step: turn on TOTP and save your backup codes.</div>
    {/if}

    {#if data.justConfigured}
      <div class="alert compact success">Two-factor authentication is active.</div>
    {/if}

    {#if data.user?.twoFactorEnabled}
      <section class="panel panel-body stack-sm">
        <div>
          <h2 class="panel-title">Two-factor authentication is on</h2>
          <p class="section-note">Keep your backup codes somewhere offline before you rotate them.</p>
        </div>

        {#if form?.stage === 'regenerate' && form?.message}
          <div class="alert success">{form.message}</div>
        {:else if form?.stage === 'disable' && form?.message}
          <div class={`alert ${form.stage === 'disable' && form.message.includes('disabled') ? 'success' : 'error'}`}>{form.message}</div>
        {/if}

        {#if form?.backupCodes?.length}
          <div class="stack-sm">
            <strong>New backup codes</strong>
            <pre class="backup-codes">{form.backupCodes.join('\n')}</pre>
          </div>
        {/if}

        <form method="POST" action="?/regenerate" class="stack-sm">
          <label class="field">
            <span class="label">Password</span>
            <input class="input" type="password" name="password" autocomplete="current-password" required />
          </label>
          <button class="button-secondary" type="submit">Generate fresh backup codes</button>
        </form>

        <form method="POST" action="?/disable" class="stack-sm">
          <label class="field">
            <span class="label">Password</span>
            <input class="input" type="password" name="password" autocomplete="current-password" required />
          </label>
          <button class="button-danger" type="submit">Disable two-factor authentication</button>
        </form>
      </section>
    {:else}
      <div class="security-grid">
        <section class="panel panel-body stack-sm">
          <div>
            <h2 class="panel-title">Enable TOTP</h2>
            <p class="section-note">Authenticate with an app like 1Password, Aegis, or Google Authenticator.</p>
          </div>

          {#if form?.stage === 'enable' && form?.message}
            <div class={`alert ${form.qrCodeDataUrl ? 'success' : 'error'}`}>{form.message}</div>
          {/if}

          <form method="POST" action="?/enable" class="stack-sm">
            <label class="field">
              <span class="label">Password</span>
              <input class="input" type="password" name="password" autocomplete="current-password" required />
            </label>
            <button class="button" type="submit">Generate QR code</button>
          </form>

          {#if form?.qrCodeDataUrl}
            <div class="stack-sm">
              <img class="totp-qr" alt="Two-factor QR code" src={form.qrCodeDataUrl} />
              <details class="panel panel-muted panel-body">
                <summary>Manual setup key</summary>
                <div class="manual-secret">{form.totpUri}</div>
              </details>
              <pre class="backup-codes">{form.backupCodes.join('\n')}</pre>
            </div>
          {/if}
        </section>

        <section class="panel panel-body stack-sm">
          <div>
            <h2 class="panel-title">Finish setup</h2>
            <p class="section-note">After scanning the QR code, verify the current code once to activate protection.</p>
          </div>

          {#if form?.stage === 'verify' && form?.message}
            <div class="alert error">{form.message}</div>
          {/if}

          <form method="POST" action="?/verify" class="stack-sm">
            <label class="field">
              <span class="label">Authenticator code</span>
              <input class="input" type="text" name="code" inputmode="numeric" autocomplete="one-time-code" required />
            </label>

            <label class="checkbox-row">
              <input type="checkbox" name="trust_device" />
              <span>Trust this device for 30 days after setup</span>
            </label>

            <button class="button-secondary" type="submit">Activate two-factor authentication</button>
          </form>
        </section>
      </div>
    {/if}
  </div>
</div>
