// 每个角色的聊天页主题，与人设匹配：
// 顾冽（总裁）冷峻深蓝 / 林屿（医生）治愈青绿 / 沈默（律师）沉稳墨灰 / 苏晨（大学生）阳光橙黄
// 设计稿见 Pencil（chat-pages 四屏）。所有类名必须是完整字面量，便于 Tailwind 扫描。
export interface CharacterTheme {
  pageBg: string;
  headerBg: string;
  headerBorder: string;
  headerName: string;
  headerStatus: string;
  headerIcon: string;
  headerIconHover: string;
  avatarRing: string;
  userBubble: string;
  charBubble: string;
  userAvatarBg: string;
  timeText: string;
  playIcon: string;
  playRing: string;
  inputBarBg: string;
  inputBorder: string;
  inputFieldBg: string;
  inputFocusRing: string;
  sendBtn: string;
  micIcon: string;
  welcomeAccent: string;
}

const defaultTheme: CharacterTheme = {
  pageBg: 'bg-gray-50',
  headerBg: 'bg-white',
  headerBorder: 'border-gray-100',
  headerName: 'text-gray-800',
  headerStatus: 'text-green-500',
  headerIcon: 'text-gray-600',
  headerIconHover: 'hover:bg-gray-100',
  avatarRing: 'border-gray-200',
  userBubble: 'bg-pink-500 text-white',
  charBubble: 'border-gray-100 bg-white text-gray-800',
  userAvatarBg: 'bg-pink-500',
  timeText: 'text-gray-400',
  playIcon: 'fill-pink-500 text-pink-500',
  playRing: 'ring-pink-200',
  inputBarBg: 'bg-white',
  inputBorder: 'border-gray-100',
  inputFieldBg: 'bg-gray-100',
  inputFocusRing: 'focus:ring-pink-300',
  sendBtn: 'bg-pink-500 hover:bg-pink-600',
  micIcon: 'text-gray-600',
  welcomeAccent: 'text-gray-500',
};

const themes: Record<string, CharacterTheme> = {
  'gu-lie': {
    pageBg: 'bg-gradient-to-b from-slate-100 to-slate-200',
    headerBg: 'bg-slate-900',
    headerBorder: 'border-slate-800',
    headerName: 'text-white',
    headerStatus: 'text-slate-400',
    headerIcon: 'text-slate-300',
    headerIconHover: 'hover:bg-slate-800',
    avatarRing: 'border-slate-600',
    userBubble: 'bg-slate-800 text-white',
    charBubble: 'border-slate-200 bg-white text-slate-800',
    userAvatarBg: 'bg-slate-700',
    timeText: 'text-slate-400',
    playIcon: 'fill-slate-600 text-slate-600',
    playRing: 'ring-slate-300',
    inputBarBg: 'bg-white',
    inputBorder: 'border-slate-200',
    inputFieldBg: 'bg-slate-100',
    inputFocusRing: 'focus:ring-slate-400',
    sendBtn: 'bg-slate-900 hover:bg-slate-700',
    micIcon: 'text-slate-600',
    welcomeAccent: 'text-slate-500',
  },
  'lin-yu': {
    pageBg: 'bg-gradient-to-b from-teal-50 to-cyan-50',
    headerBg: 'bg-teal-50',
    headerBorder: 'border-teal-200',
    headerName: 'text-teal-900',
    headerStatus: 'text-teal-600',
    headerIcon: 'text-teal-700',
    headerIconHover: 'hover:bg-teal-100',
    avatarRing: 'border-teal-200',
    userBubble: 'bg-teal-500 text-white',
    charBubble: 'border-teal-100 bg-white text-gray-800',
    userAvatarBg: 'bg-teal-600',
    timeText: 'text-teal-600/60',
    playIcon: 'fill-teal-600 text-teal-600',
    playRing: 'ring-teal-200',
    inputBarBg: 'bg-white',
    inputBorder: 'border-teal-100',
    inputFieldBg: 'bg-teal-50',
    inputFocusRing: 'focus:ring-teal-300',
    sendBtn: 'bg-teal-500 hover:bg-teal-600',
    micIcon: 'text-teal-700',
    welcomeAccent: 'text-teal-600',
  },
  'shen-mo': {
    pageBg: 'bg-gradient-to-b from-stone-100 to-stone-200',
    headerBg: 'bg-stone-800',
    headerBorder: 'border-stone-700',
    headerName: 'text-white',
    headerStatus: 'text-stone-400',
    headerIcon: 'text-stone-300',
    headerIconHover: 'hover:bg-stone-700',
    avatarRing: 'border-stone-500',
    userBubble: 'bg-stone-700 text-stone-50',
    charBubble: 'border-stone-200 bg-white text-stone-800',
    userAvatarBg: 'bg-stone-600',
    timeText: 'text-stone-400',
    playIcon: 'fill-amber-700 text-amber-700',
    playRing: 'ring-amber-200',
    inputBarBg: 'bg-white',
    inputBorder: 'border-stone-200',
    inputFieldBg: 'bg-stone-100',
    inputFocusRing: 'focus:ring-stone-400',
    sendBtn: 'bg-stone-800 hover:bg-stone-700',
    micIcon: 'text-stone-600',
    welcomeAccent: 'text-amber-700',
  },
  'su-chen': {
    pageBg: 'bg-gradient-to-b from-amber-50 to-orange-100',
    headerBg: 'bg-gradient-to-r from-orange-400 to-amber-400',
    headerBorder: 'border-orange-300',
    headerName: 'text-white',
    headerStatus: 'text-orange-50',
    headerIcon: 'text-white',
    headerIconHover: 'hover:bg-white/20',
    avatarRing: 'border-orange-200',
    userBubble: 'bg-orange-400 text-white',
    charBubble: 'border-orange-200 bg-white text-gray-800',
    userAvatarBg: 'bg-orange-500',
    timeText: 'text-orange-400',
    playIcon: 'fill-orange-500 text-orange-500',
    playRing: 'ring-orange-200',
    inputBarBg: 'bg-white',
    inputBorder: 'border-orange-100',
    inputFieldBg: 'bg-orange-50',
    inputFocusRing: 'focus:ring-orange-300',
    sendBtn: 'bg-orange-500 hover:bg-orange-600',
    micIcon: 'text-orange-600',
    welcomeAccent: 'text-orange-500',
  },
};

export function getCharacterTheme(characterId?: string): CharacterTheme {
  return (characterId && themes[characterId]) || defaultTheme;
}
