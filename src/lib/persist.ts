/**
 * The account lives in this browser's storage. Browsers may evict storage
 * under disk pressure unless the site is granted "persistent" storage, so we
 * ask for it once the user has set up their account. Browsers decide on
 * their own whether to grant it; nothing is shown to the user.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function isPersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
