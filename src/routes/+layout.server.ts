import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
  return {
    authSetupComplete: locals.authSetupComplete,
    authTablesReady: locals.authTablesReady,
    hasRemoteBackend: !!platform?.env.DB,
    session: locals.session,
    user: locals.user
  };
};
