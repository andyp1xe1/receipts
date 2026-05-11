import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user?.kind === 'local') {
    throw redirect(303, '/');
  }
  if (locals.user?.kind !== 'remote') {
    throw redirect(303, '/login');
  }
  const role = (locals.user as { role?: string }).role;
  if (role !== 'ADMIN') {
    throw redirect(303, '/');
  }
  return { selfId: locals.user.id };
};
