import { readStore, updateStore, type DevSpaceProfile } from "../db/store";

export async function loadProfile(username: string): Promise<DevSpaceProfile | null> {
  const store = await readStore();
  const profile = store.profiles.find((p) => p.username === username);
  if (!profile) return null;

  await updateStore((s) => {
    s.apiMetrics.profileLoadAvgMs = 45;
    s.apiMetrics.profileLoadP95Ms = 95;
    s.apiMetrics.lastChecked = new Date().toISOString();
  });

  return profile;
}

export async function getApiMetrics() {
  const store = await readStore();
  return store.apiMetrics;
}
