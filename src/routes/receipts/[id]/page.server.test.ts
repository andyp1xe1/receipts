import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db/receipts', () => ({
  deleteReceipt: vi.fn(),
  getReceiptById: vi.fn(),
  updateReceiptMetadata: vi.fn()
}));

import { actions, load } from './+page.server';
import { deleteReceipt, getReceiptById, updateReceiptMetadata } from '$lib/server/db/receipts';

function makeSaveEvent(form: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(form)) formData.set(key, value);

  const request = new Request('https://example.test/receipts/r1', { method: 'POST' });
  Object.defineProperty(request, 'formData', {
    value: vi.fn(async () => formData)
  });

  return {
    request,
    platform: undefined,
    params: { id: 'r1' }
  } as Parameters<typeof actions.save>[0] & { request: Request };
}

describe('receipt detail page', () => {
  it('redirects to home when the receipt is missing', async () => {
    vi.mocked(getReceiptById).mockResolvedValue(null);

    await expect(
      load({
        params: { id: 'missing' },
        platform: undefined,
        url: new URL('https://example.test/receipts/missing')
      } as Parameters<typeof load>[0])
    ).rejects.toMatchObject({ status: 303, location: '/' });
  });

  it('returns receipt detail flags when found', async () => {
    vi.mocked(getReceiptById).mockResolvedValue({ id: 'r1' } as never);

    const result = await load({
      params: { id: 'r1' },
      platform: undefined,
      url: new URL('https://example.test/receipts/r1?created=1&duplicate=1')
    } as Parameters<typeof load>[0]);

    expect(result).toMatchObject({
      receipt: { id: 'r1' },
      created: true,
      duplicate: true
    });
  });

  it('saves trimmed metadata', async () => {
    const result = await actions.save(
      makeSaveEvent({ category: ' Fuel ', note: ' Note here ' })
    );

    expect(updateReceiptMetadata).toHaveBeenCalledWith(undefined, {
      id: 'r1',
      category: 'Fuel',
      note: 'Note here'
    });
    expect(result).toEqual({ type: 'success', message: 'Metadata saved.' });
  });

  it('normalizes empty metadata fields to null', async () => {
    await actions.save(makeSaveEvent({ category: '   ', note: '' }));

    expect(updateReceiptMetadata).toHaveBeenCalledWith(undefined, {
      id: 'r1',
      category: null,
      note: null
    });
  });

  it('redirects after successful delete', async () => {
    vi.mocked(deleteReceipt).mockResolvedValue();

    await expect(
      actions.delete({ platform: undefined, params: { id: 'r1' } } as Parameters<typeof actions.delete>[0])
    ).rejects.toMatchObject({ status: 303, location: '/' });
  });

  it('returns a safe failure when delete fails', async () => {
    vi.mocked(deleteReceipt).mockRejectedValue(new Error('db down'));

    const result = await actions.delete({
      platform: undefined,
      params: { id: 'r1' }
    } as Parameters<typeof actions.delete>[0]);

    expect(result).toMatchObject({
      status: 400,
      data: { type: 'error', message: 'Could not delete the receipt.' }
    });
  });
});
