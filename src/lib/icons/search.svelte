<script lang="ts">
  let { class: className = '' }: { class?: string } = $props();
</script>

<svg
  class={className}
  viewBox="0 0 80 80"
  fill="none"
  stroke="currentColor"
  stroke-width="1.4"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <circle cx="34" cy="34" r="18" />
  <path d="M47 47 L62 62" />
  <path d="M28 34 H40" />
</svg>
