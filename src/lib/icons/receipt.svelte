<script lang="ts">
  let { class: className = '' }: { class?: string } = $props();
</script>

<svg
  class={className}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="M5 3 H19 V20 L17 18.5 L15 20 L13 18.5 L11 20 L9 18.5 L7 20 L5 18.5 Z" />
  <path d="M8 8 H16" />
  <path d="M8 12 H14" />
</svg>
