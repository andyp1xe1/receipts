import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    authSetupComplete: locals.authSetupComplete,
    authTablesReady: locals.authTablesReady,
    session: locals.session,
    user: locals.user
  };
};
