import { readStore, updateStore, type DevSpaceProfile } from "../db/store";

export async function getFriends(userId: string): Promise<DevSpaceProfile[]> {
  const store = await readStore();
  const profile = store.profiles.find((p) => p.userId === userId);
  if (!profile) return [];

  return store.profiles.filter((p) => profile.friends.includes(p.userId));
}

export async function addFriend(userId: string, friendId: string): Promise<void> {
  await updateStore((s) => {
    const userProfile = s.profiles.find((p) => p.userId === userId);
    const friendProfile = s.profiles.find((p) => p.userId === friendId);

    if (userProfile && !userProfile.friends.includes(friendId)) {
      userProfile.friends.push(friendId);
    }
    if (friendProfile && !friendProfile.friends.includes(userId)) {
      friendProfile.friends.push(userId);
    }
  });
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  await updateStore((s) => {
    const userProfile = s.profiles.find((p) => p.userId === userId);
    const friendProfile = s.profiles.find((p) => p.userId === friendId);

    if (userProfile) {
      userProfile.friends = userProfile.friends.filter((id) => id !== friendId);
    }
    if (friendProfile) {
      friendProfile.friends = friendProfile.friends.filter((id) => id !== userId);
    }
  });
}

export async function getSuggestedFriends(userId: string): Promise<DevSpaceProfile[]> {
  const store = await readStore();
  const profile = store.profiles.find((p) => p.userId === userId);
  if (!profile) return [];

  return store.profiles.filter(
    (p) => p.userId !== userId && !profile.friends.includes(p.userId)
  );
}
