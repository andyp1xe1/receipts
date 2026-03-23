<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import QrScanner from 'qr-scanner';
  import { normalizeReceiptSource } from '$lib/utils/receipt-source';

  let { onscan }: { onscan?: (value: string) => void } = $props();

  let videoElement = $state<HTMLVideoElement | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let scanner: QrScanner | null = null;

  let scannerOpen = $state(false);
  let scannerBusy = $state(false);
  let scannerError = $state<string | null>(null);

  async function stopScanner() {
    await scanner?.stop();
    scanner?.destroy();
    scanner = null;
    scannerOpen = false;
    scannerBusy = false;
  }

  function publishScan(rawValue: string) {
    const normalized = normalizeReceiptSource(rawValue);
    if (!normalized) {
      scannerError = 'The QR code did not contain a supported MEV receipt URL.';
      return;
    }

    scannerError = null;
    onscan?.(normalized);
    void stopScanner();
  }

  async function startScanner() {
    scannerError = null;
    scannerBusy = true;

    try {
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        scannerError = 'No camera available.';
        return;
      }

      scannerOpen = true;
      await tick();
      if (!videoElement) throw new Error('Camera preview could not be opened.');

      scanner?.destroy();
      scanner = new QrScanner(
        videoElement,
        (result) => publishScan(result.data),
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: false,
          returnDetailedScanResult: true,
          maxScansPerSecond: 8,
          onDecodeError: () => {}
        }
      );

      await scanner.start();
    } catch (error) {
      scannerError = error instanceof Error ? error.message : 'Camera access failed.';
      await stopScanner();
    } finally {
      scannerBusy = false;
    }
  }

  async function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    scannerError = null;
    scannerBusy = true;

    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      publishScan(result.data);
    } catch (error) {
      scannerError = error instanceof Error ? error.message : 'Could not read QR code from that photo.';
    } finally {
      input.value = '';
      scannerBusy = false;
    }
  }

  function openPhotoPicker() {
    fileInput?.click();
  }

  onDestroy(() => {
    void stopScanner();
  });
</script>

{#if scannerOpen}
  <button class="button-ghost" type="button" onclick={stopScanner} title="Stop camera">Stop</button>
{:else}
  <button class="button-secondary" type="button" onclick={startScanner} disabled={scannerBusy} title="Scan with camera">Camera</button>
{/if}
<button class="button-secondary" type="button" onclick={openPhotoPicker} disabled={scannerBusy} title="Scan from photo">Photo</button>

<input
  bind:this={fileInput}
  class="scanner-file-input"
  type="file"
  accept="image/*"
  onchange={handleFileChange}
/>

{#if scannerError}
  <div class="import-feedback alert error">{scannerError}</div>
{/if}

{#if scannerOpen}
  <div class="import-feedback scanner-frame">
    <video bind:this={videoElement} class="scanner-video" playsinline muted></video>
  </div>
{/if}
