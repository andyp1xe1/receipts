<script lang="ts">
  import GitHubIcon from '$lib/icons/github.svelte';
  import Mascot from '$lib/icons/mascot.svelte';
  import ReceiptIcon from '$lib/icons/receipt.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const repoUrl = 'https://github.com/andyp1xe1/receipts';
  const deployUrl = `https://deploy.workers.cloudflare.com/?url=${repoUrl}`;
  const entryHref = $derived(data.user ? '/' : '/login');
  const entryLabel = $derived(data.user ? 'Open the ledger' : 'Try the ledger');
</script>

<svelte:head>
  <title>Receipt Ledger</title>
  <meta
    name="description"
    content="A small ledger for Moldova MEV receipts. Run it locally in your browser, or deploy your own copy to Cloudflare."
  />
</svelte:head>

<div class="landing">
  <div class="frame" aria-hidden="true">
    <span class="frame-line frame-line-top"></span>
    <span class="frame-line frame-line-bottom"></span>
    <span class="frame-line frame-line-left"></span>
    <span class="frame-line frame-line-right"></span>
    <span class="frame-marker frame-marker-tl"></span>
    <span class="frame-marker frame-marker-tr"></span>
    <span class="frame-marker frame-marker-bl"></span>
    <span class="frame-marker frame-marker-br"></span>
  </div>

  <main class="landing-main">
    <Mascot class="landing-mascot" variant="filled" />

    <h1 class="landing-title">A ledger for your receipts.</h1>

    <p class="landing-prose">
      Paste a Moldovan MEV receipt URL, or scan its QR &mdash; the ledger does
      the rest.
    </p>

    <div class="landing-actions">
      <a class="cta cta-primary" href={entryHref}>
        <ReceiptIcon />
        <span>{entryLabel}</span>
      </a>
      <a class="cta-deploy" href={deployUrl} rel="noreferrer" target="_blank">
        <img
          src="https://deploy.workers.cloudflare.com/button"
          alt="Deploy to Cloudflare"
          height="40"
        />
      </a>
      <a class="cta cta-github" href={repoUrl} rel="noreferrer" target="_blank">
        <GitHubIcon />
        <span>View on GitHub</span>
      </a>
    </div>
  </main>
</div>

<style>
  .landing {
    position: relative;
    width: min(560px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 24px 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .frame {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    --line-color: rgba(237, 231, 222, 0.16);
    --marker-color: rgba(237, 231, 222, 0.45);
    --frame-x: max(20px, calc((100vw - 760px) / 2));
    --frame-y: max(56px, calc((100vh - 580px) / 2));
  }

  .frame-line {
    position: absolute;
  }

  .frame-line-top,
  .frame-line-bottom {
    left: 0;
    right: 0;
    height: 0;
    border-top: 1px dashed var(--line-color);
  }

  .frame-line-top {
    top: var(--frame-y);
  }

  .frame-line-bottom {
    bottom: var(--frame-y);
  }

  .frame-line-left,
  .frame-line-right {
    top: 0;
    bottom: 0;
    width: 0;
    border-left: 1px dashed var(--line-color);
  }

  .frame-line-left {
    left: var(--frame-x);
  }

  .frame-line-right {
    right: var(--frame-x);
  }

  .frame-marker {
    position: absolute;
    width: 6px;
    height: 6px;
    border: 1px solid var(--marker-color);
    background: var(--bg);
  }

  .frame-marker-tl {
    top: var(--frame-y);
    left: var(--frame-x);
    transform: translate(-50%, -50%);
  }

  .frame-marker-tr {
    top: var(--frame-y);
    right: var(--frame-x);
    transform: translate(50%, -50%);
  }

  .frame-marker-bl {
    bottom: var(--frame-y);
    left: var(--frame-x);
    transform: translate(-50%, 50%);
  }

  .frame-marker-br {
    bottom: var(--frame-y);
    right: var(--frame-x);
    transform: translate(50%, 50%);
  }

  .landing-main {
    position: relative;
    z-index: 1;
    flex: 1;
    padding: 48px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 20px;
  }

  .landing-main :global(.landing-mascot) {
    width: 124px;
    height: auto;
    margin-bottom: 4px;
  }

  .landing-title {
    margin: 0;
    font-size: 32px;
    font-weight: 600;
    line-height: 1.15;
    letter-spacing: -0.035em;
  }

  .landing-prose {
    margin: 0;
    color: var(--muted);
    max-width: 46ch;
    font-size: 15px;
    line-height: 1.6;
  }

  .landing-actions {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  .cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
  }

  .cta :global(svg) {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .cta-primary {
    background: var(--accent);
    color: var(--bg);
  }

  .cta-github {
    background: #24292e;
    color: #fff;
  }

  .cta-deploy {
    display: inline-flex;
    align-items: center;
    line-height: 0;
  }

  .cta-deploy img {
    height: 40px;
    width: auto;
    display: block;
  }

  @media (max-width: 560px) {
    .landing-main {
      padding: 32px 0;
    }

    .landing-title {
      font-size: 26px;
    }
  }
</style>
