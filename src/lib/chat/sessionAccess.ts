export function canReadChatSessionMessages(
  currentUserId: string | null,
  sessionUserId: string | null,
): boolean {
  if (currentUserId) return sessionUserId === currentUserId;
  return sessionUserId === null;
}
