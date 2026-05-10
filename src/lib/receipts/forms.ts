import { applyAction } from '$app/forms';
import type { SubmitFunction } from '@sveltejs/kit';

interface UserContext {
  user?: { kind: 'local' | 'remote' } | null;
}

export function formField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function localOr(
  data: UserContext,
  handleLocal: (formData: FormData) => unknown
): SubmitFunction {
  return ({ formData, cancel }) => {
    if (data.user?.kind === 'local') {
      cancel();
      handleLocal(formData);
      return;
    }
    return async ({ result }) => {
      await applyAction(result);
    };
  };
}
