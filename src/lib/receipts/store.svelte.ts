import { browser } from '$app/environment';
import { invalidateAll } from '$app/navigation';
import { STORAGE_KEY } from '$lib/local-store';
import * as localStore from '$lib/local-store';
import type { ReceiptRecord, ReceiptSummary } from '$lib/types';
import { parseReceiptRecord } from './record';

interface UserContext {
  user?: { kind: 'local' | 'remote' } | null;
}

interface ListContext extends UserContext {
  receipts?: ReceiptRecord[];
}

interface DetailContext extends UserContext {
  receipt?: ReceiptSummary | null;
}

export interface ReceiptsView {
  readonly kind: 'local' | 'remote';
  readonly records: ReceiptRecord[];
  refresh(): void | Promise<void>;
}

export interface ReceiptView {
  readonly kind: 'local' | 'remote';
  readonly receipt: ReceiptSummary | null;
  refresh(): void | Promise<void>;
}

function listenForLocalChanges(reload: () => void): () => void {
  if (!browser) return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) reload();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

export function useReceipts(getData: () => ListContext): ReceiptsView {
  const kind = $derived(getData().user?.kind ?? 'remote');
  let local = $state<ReceiptRecord[]>([]);

  $effect(() => {
    if (kind !== 'local' || !browser) return;
    local = localStore.list();
    return listenForLocalChanges(() => {
      local = localStore.list();
    });
  });

  return {
    get kind() {
      return kind;
    },
    get records() {
      return kind === 'local' ? local : (getData().receipts ?? []);
    },
    refresh() {
      if (kind === 'local') {
        local = localStore.list();
      } else {
        return invalidateAll();
      }
    }
  };
}

export function useReceipt(getData: () => DetailContext, getId: () => string): ReceiptView {
  const kind = $derived(getData().user?.kind ?? 'remote');
  let local = $state<ReceiptRecord | null>(null);

  $effect(() => {
    if (kind !== 'local' || !browser) return;
    const id = getId();
    local = localStore.get(id);
    return listenForLocalChanges(() => {
      local = localStore.get(id);
    });
  });

  return {
    get kind() {
      return kind;
    },
    get receipt() {
      if (kind === 'remote') return getData().receipt ?? null;
      return local ? parseReceiptRecord(local) : null;
    },
    refresh() {
      if (kind === 'local') {
        local = localStore.get(getId());
      } else {
        return invalidateAll();
      }
    }
  };
}
