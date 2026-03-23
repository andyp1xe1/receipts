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
  let scannerStatus = $state('Ready to scan a receipt QR code.');

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
    scannerStatus = 'Receipt URL captured.';
    onscan?.(normalized);
    void stopScanner();
  }

  async function startScanner() {
    scannerError = null;
    scannerBusy = true;
    scannerStatus = 'Checking camera access...';

    try {
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        scannerError = 'No camera is available on this device.';
        scannerStatus = 'Use a saved photo instead.';
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
      scannerStatus = 'Point the camera at the QR code.';
    } catch (error) {
      scannerError = error instanceof Error ? error.message : 'Camera access failed.';
      scannerStatus = 'Use a saved photo instead.';
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
    scannerStatus = 'Reading photo...';

    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      publishScan(result.data);
    } catch (error) {
      scannerError = error instanceof Error ? error.message : 'Could not read the QR code from that photo.';
      scannerStatus = 'Try another photo or use the camera.';
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

<div class="scanner-panel">
  <div class="scanner-actions">
    <button class="button-secondary" type="button" onclick={startScanner} disabled={scannerBusy}>
      {scannerOpen ? 'Restart camera' : 'Scan with camera'}
    </button>
    <button class="button-secondary" type="button" onclick={openPhotoPicker} disabled={scannerBusy}>
      Scan from photo
    </button>
    {#if scannerOpen}
      <button class="button-ghost" type="button" onclick={stopScanner}>Stop</button>
    {/if}
  </div>

  <input
    bind:this={fileInput}
    class="scanner-file-input"
    type="file"
    accept="image/*"
    capture="environment"
    onchange={handleFileChange}
  />

  <div class="scanner-status">{scannerStatus}</div>

  {#if scannerError}
    <div class="alert error scanner-alert">{scannerError}</div>
  {/if}

  {#if scannerOpen}
    <div class="scanner-frame">
      <video bind:this={videoElement} class="scanner-video" playsinline muted></video>
    </div>
  {:else}
    <div class="scanner-placeholder">
      Camera scanning opens here. You can also scan a saved screenshot or photo.
    </div>
  {/if}
</div>
