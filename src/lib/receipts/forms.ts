import { applyAction } from '$app/forms';
import type { SubmitFunction } from '@sveltejs/kit';

interface UserContext {
  user?: { kind: 'local' | 'remote' } | null;
}

/**
 * Returns a `use:enhance` SubmitFunction that runs the given local handler
 * for local users (cancelling the form post) and falls back to the server
 * action via `applyAction` for remote users. Keeps the local/remote branch
 * out of every form.
 */
export function localOr(
  data: UserContext,
  handleLocal: (formData: FormData) => void | Promise<void>
): SubmitFunction {
  return ({ formData, cancel }) => {
    if (data.user?.kind === 'local') {
      cancel();
      void handleLocal(formData);
      return;
    }
    return async ({ result }) => {
      await applyAction(result);
    };
  };
}
