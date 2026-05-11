<script lang="ts">
  import AppHeader from '$lib/components/app-header.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    banned: boolean;
    banReason: string | null;
    banExpires: number | null;
    createdAt: number;
  }

  let users = $state<AdminUser[]>([]);
  let total = $state(0);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let busyId = $state<string | null>(null);

  async function fetchToken(): Promise<string> {
    const res = await fetch('/admin/token', { method: 'POST' });
    if (!res.ok) throw new Error('Could not mint an API token');
    const body = (await res.json()) as { token: string };
    return body.token;
  }

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await fetchToken();
    const res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      }
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Request failed (${res.status})`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async function refresh() {
    loading = true;
    error = null;
    try {
      const body = await api<{ items: AdminUser[]; total: number }>('/api/v1/admin/users?limit=100');
      users = body.items;
      total = body.total;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load users';
    } finally {
      loading = false;
    }
  }

  async function ban(id: string) {
    busyId = id;
    try {
      const updated = await api<AdminUser>(`/api/v1/admin/users/${id}/ban`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Banned by admin' })
      });
      users = users.map((u) => (u.id === id ? updated : u));
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to ban user';
    } finally {
      busyId = null;
    }
  }

  async function unban(id: string) {
    busyId = id;
    try {
      const updated = await api<AdminUser>(`/api/v1/admin/users/${id}/unban`, {
        method: 'POST'
      });
      users = users.map((u) => (u.id === id ? updated : u));
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to unban user';
    } finally {
      busyId = null;
    }
  }

  $effect(() => {
    void refresh();
  });
</script>

<AppHeader user={{ kind: 'remote', id: data.selfId } as App.AppUser} back title="Admin" />

<main class="admin">
  <section class="admin-header">
    <div>
      <h1>Users</h1>
      <p class="muted">
        {#if loading}
          Loading…
        {:else}
          {total} total · powered by <code>/api/v1/admin/users</code>
        {/if}
      </p>
    </div>
    <button class="button-ghost" type="button" onclick={() => void refresh()} disabled={loading}>
      Refresh
    </button>
  </section>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <table class="users">
    <thead>
      <tr>
        <th>Email</th>
        <th>Name</th>
        <th>Role</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each users as user (user.id)}
        <tr class:banned={user.banned}>
          <td>{user.email}</td>
          <td>{user.name}</td>
          <td><span class="role">{user.role}</span></td>
          <td>
            {#if user.banned}
              <span class="status banned-pill">Banned{user.banReason ? ` — ${user.banReason}` : ''}</span>
            {:else}
              <span class="status active-pill">Active</span>
            {/if}
          </td>
          <td class="row-actions">
            {#if user.id === data.selfId}
              <span class="muted">you</span>
            {:else if user.banned}
              <button type="button" disabled={busyId === user.id} onclick={() => void unban(user.id)}>
                Unban
              </button>
            {:else}
              <button type="button" disabled={busyId === user.id} onclick={() => void ban(user.id)}>
                Ban
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</main>

<style>
  .admin {
    max-width: 64rem;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }

  .admin-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .muted {
    color: var(--text-muted, #888);
    margin: 0.25rem 0 0;
  }

  .muted code {
    font-size: 0.85em;
  }

  .error {
    color: var(--color-error, #c33);
    background: var(--color-error-bg, rgba(204, 51, 51, 0.08));
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
  }

  .users {
    width: 100%;
    border-collapse: collapse;
  }

  .users th,
  .users td {
    padding: 0.625rem 0.5rem;
    text-align: left;
    border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.08));
    font-size: 0.95em;
  }

  .users th {
    font-weight: 600;
    color: var(--text-muted, #888);
    font-size: 0.85em;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  tr.banned td {
    opacity: 0.6;
  }

  .role {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    background: var(--surface-muted, rgba(0, 0, 0, 0.05));
    font-size: 0.8em;
    font-weight: 600;
  }

  .status {
    font-size: 0.85em;
  }

  .banned-pill {
    color: var(--color-error, #c33);
  }

  .active-pill {
    color: var(--color-success, #2a8);
  }

  .row-actions {
    text-align: right;
  }

  .row-actions button {
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid var(--border, rgba(0, 0, 0, 0.12));
    background: transparent;
    cursor: pointer;
    font-size: 0.85em;
  }

  .row-actions button:hover:not(:disabled) {
    background: var(--surface-muted, rgba(0, 0, 0, 0.04));
  }

  .row-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
