/** Settings-panel and status strings. Character lines live in dialogue.js. */
export const LANGUAGES = Object.freeze(['tr', 'en', 'zh']);

export const MESSAGES = Object.freeze({
  tr: Object.freeze({
    'panel.title': 'DeepSeek-chan',
    'panel.subtitle': 'Küçük balina asistanın 🐋',
    'panel.close': 'Ayarları kapat',
    'setting.scope': 'Takip et',
    'setting.scopeGlobal': 'Tüm oturumlar',
    'setting.scopeCurrent': 'Açık oturum',
    'setting.size': 'Boyut',
    'setting.motion': 'Animasyonlar',
    'setting.chatter': 'Kendi kendine konuşsun',
    'setting.wheel': 'Tekerlekle boyutlandır',
    'setting.sleep': 'Uykuya dalma',
    'setting.language': 'Dil',
    'setting.languageAuto': 'Otomatik',
    'time.30s': '30 saniye',
    'time.2m': '2 dakika',
    'time.5m': '5 dakika',
    'time.never': 'Asla',
    'action.reset': 'Konumu sıfırla',
    'action.hide': 'Sakla',
    'action.restore': 'DeepSeek-chan’ı geri çağır 🐋',
    'pet.aria': 'DeepSeek-chan: {status}. Tıkla: sohbet, çift tıkla: sevgi, orta tık: başını okşa, sağ tık veya Enter: ayarlar, ok tuşları: taşı.',
    'pet.working': '{count} oturum çalışıyor',
    'pet.size': 'Boyut: %{size}',
  }),
  en: Object.freeze({
    'panel.title': 'DeepSeek-chan',
    'panel.subtitle': 'Your little whale assistant 🐋',
    'panel.close': 'Close settings',
    'setting.scope': 'Follow',
    'setting.scopeGlobal': 'All sessions',
    'setting.scopeCurrent': 'Current session',
    'setting.size': 'Size',
    'setting.motion': 'Animations',
    'setting.chatter': 'Idle chatter',
    'setting.wheel': 'Scroll to resize',
    'setting.sleep': 'Nap after',
    'setting.language': 'Language',
    'setting.languageAuto': 'Auto',
    'time.30s': '30 seconds',
    'time.2m': '2 minutes',
    'time.5m': '5 minutes',
    'time.never': 'Never',
    'action.reset': 'Reset position',
    'action.hide': 'Tuck away',
    'action.restore': 'Bring back DeepSeek-chan 🐋',
    'pet.aria': 'DeepSeek-chan: {status}. Click to chat, double-click for love, middle-click to pat, right-click or Enter for settings, arrow keys to move.',
    'pet.working': '{count} sessions working',
    'pet.size': 'Size: {size}%',
  }),
  zh: Object.freeze({
    'panel.title': 'DeepSeek 酱',
    'panel.subtitle': '你的小鲸鱼助手 🐋',
    'panel.close': '关闭设置',
    'setting.scope': '感知范围',
    'setting.scopeGlobal': '全局会话',
    'setting.scopeCurrent': '当前会话',
    'setting.size': '显示大小',
    'setting.motion': '动画',
    'setting.chatter': '自言自语',
    'setting.wheel': '滚轮调整大小',
    'setting.sleep': '空闲后睡觉',
    'setting.language': '语言',
    'setting.languageAuto': '自动',
    'time.30s': '30 秒',
    'time.2m': '2 分钟',
    'time.5m': '5 分钟',
    'time.never': '从不',
    'action.reset': '恢复位置',
    'action.hide': '收起',
    'action.restore': '唤回 DeepSeek 酱 🐋',
    'pet.aria': 'DeepSeek 酱：{status}。点击聊天，双击示爱，中键摸头，右键或 Enter 打开设置，方向键移动。',
    'pet.working': '{count} 个会话工作中',
    'pet.size': '大小：{size}%',
  }),
});

/** Map any locale tag to a supported language, or undefined. */
export function matchLanguage(tag) {
  if (typeof tag !== 'string') return undefined;
  const base = tag.trim().toLowerCase().split(/[-_]/)[0];
  return LANGUAGES.includes(base) ? base : undefined;
}

/**
 * Resolve the language to show. An explicit preference wins; "auto" follows
 * DSH's active locale, but a Turkish browser beats DSH's English default
 * because DSH itself ships no Turkish UI.
 */
export function resolveLanguage(preference, dshLocale, browserLocale) {
  if (LANGUAGES.includes(preference)) return preference;
  const dsh = matchLanguage(dshLocale);
  const browser = matchLanguage(browserLocale);
  if (dsh && dsh !== 'en') return dsh;
  if (browser === 'tr') return 'tr';
  return dsh || browser || 'en';
}

export function translate(language, key, values = {}) {
  const message = MESSAGES[language]?.[key] ?? MESSAGES.en[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}
