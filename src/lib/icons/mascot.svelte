<script lang="ts">
  let {
    class: className = '',
    variant = 'outline'
  }: { class?: string; variant?: 'outline' | 'filled' } = $props();
</script>

{#if variant === 'filled'}
  <svg
    class={`mascot-filled ${className}`}
    viewBox="0 0 140 160"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path
      class="mascot-body"
      d="M36 20 H104 V134 L96 126 L88 134 L80 126 L72 134 L64 126 L56 134 L48 126 L40 134 L36 126 Z"
    />
    <path class="mascot-line" d="M46 40 H94" />
    <path class="mascot-line" d="M46 52 H88" />
    <path class="mascot-line" d="M46 64 H92" />
    <circle class="mascot-eye" cx="58" cy="92" r="3" />
    <circle class="mascot-eye" cx="82" cy="92" r="3" />
    <path class="mascot-smile" d="M58 104 Q70 110 82 104" />
  </svg>
{:else}
  <svg
    class={className}
    viewBox="0 0 140 160"
    fill="none"
    stroke="currentColor"
    stroke-width="1.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M36 20 H104 V134 L96 126 L88 134 L80 126 L72 134 L64 126 L56 134 L48 126 L40 134 L36 126 Z" />
    <path d="M46 40 H94" stroke-dasharray="2 4" opacity="0.7" />
    <path d="M46 52 H88" stroke-dasharray="2 4" opacity="0.7" />
    <path d="M46 64 H92" stroke-dasharray="2 4" opacity="0.7" />
    <circle cx="58" cy="92" r="2" fill="currentColor" stroke="none" />
    <circle cx="82" cy="92" r="2" fill="currentColor" stroke="none" />
    <path d="M58 104 Q70 110 82 104" />
  </svg>
{/if}

<style>
  .mascot-filled :global(.mascot-body) {
    fill: var(--accent);
    stroke: var(--accent);
    stroke-width: 2;
  }

  .mascot-filled :global(.mascot-line) {
    stroke: var(--bg);
    stroke-width: 3;
    fill: none;
  }

  .mascot-filled :global(.mascot-eye) {
    fill: var(--bg);
    stroke: none;
  }

  .mascot-filled :global(.mascot-smile) {
    stroke: var(--bg);
    stroke-width: 3;
    fill: none;
  }
</style>
