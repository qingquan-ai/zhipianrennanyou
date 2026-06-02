export type UserAuthStatusUser = {
  email: string;
  nickname: string;
};

export function getUserAuthDisplayName(user: UserAuthStatusUser): string {
  return user.nickname.trim() || user.email.trim() || '用户';
}
