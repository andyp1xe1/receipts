import { redirectIfNotAdmin } from '$lib/server/auth/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { userId } = redirectIfNotAdmin(locals);
  return { selfId: userId };
};
