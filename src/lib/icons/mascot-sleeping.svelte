<script lang="ts">
  let { class: className = '' }: { class?: string } = $props();
</script>

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
  <path d="M48 92 Q53 89 58 92" />
  <path d="M66 92 Q71 89 76 92" />
  <path d="M54 104 H72" />
  <path d="M108 56 H120 L108 70 H120" />
  <path d="M120 38 H128 L120 48 H128" opacity="0.6" />
</svg>
