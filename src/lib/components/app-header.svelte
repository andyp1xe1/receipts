<script lang="ts">
  import type { Snippet } from 'svelte';

  type User = App.AppUser | null | undefined;

  let {
    user,
    back = false,
    title = 'Receipt Ledger',
    showSecurity = true,
    showSignOut = true,
    leading,
    trailing
  }: {
    user: User;
    back?: boolean;
    title?: string;
    showSecurity?: boolean;
    showSignOut?: boolean;
    leading?: Snippet;
    trailing?: Snippet;
  } = $props();
</script>

<header class="app-header">
  <a class="app-brand" href="/" aria-label="Go to ledger">
    {#if back}
      <span class="back-chevron" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </span>
    {/if}
    <span class="app-title">{title}</span>
  </a>

  <div class="header-actions">
    {@render leading?.()}
    {#if user?.kind === 'local'}
      <span class="mode-badge mode-badge-local" title="Receipts stored only in this browser">
        <span class="mode-dot" aria-hidden="true"></span>
        Local
      </span>
    {/if}
    {@render trailing?.()}
    {#if showSecurity && user?.kind === 'remote'}
      <a class="button-ghost" href="/settings/security">Security</a>
    {/if}
    {#if showSignOut && user}
      <form method="POST" action="/?/logout">
        <button class="button-ghost" type="submit">Sign out</button>
      </form>
    {/if}
  </div>
</header>
