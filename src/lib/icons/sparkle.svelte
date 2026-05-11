<script lang="ts">
  let { class: className = '' }: { class?: string } = $props();
</script>

<svg
  class={className}
  viewBox="0 0 120 120"
  fill="none"
  stroke="currentColor"
  stroke-width="1.4"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="M60 18 L66 50 L98 56 L66 62 L60 94 L54 62 L22 56 L54 50 Z" />
  <path
    d="M92 26 L94 32 L100 34 L94 36 L92 42 L90 36 L84 34 L90 32 Z"
    fill="currentColor"
    stroke="none"
    opacity="0.55"
  />
  <path
    d="M26 80 L27 84 L31 85 L27 86 L26 90 L25 86 L21 85 L25 84 Z"
    fill="currentColor"
    stroke="none"
    opacity="0.55"
  />
</svg>
