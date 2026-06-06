/** Cosmetic per-persona glyphs for the grid tiles. Keys match the C8 catalog. */
export const PERSONA_EMOJI: Record<string, string> = {
  rage_tapper: '👆',
  offline_commuter: '📵',
  power_user_10k: '📊',
  long_name_rtl: '🔤',
  accessibility: '♿',
  tiny_screen: '📱',
  slow_network: '🐌',
  empty_state: '📭',
  permission_denier: '🚫',
  background_resume: '🔄',
  deep_link: '🔗',
  rapid_switcher: '⚡',
};

export function personaEmoji(key: string): string {
  return PERSONA_EMOJI[key] ?? '🧪';
}

export const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ff4d6d',
  high: '#ff9f1c',
  medium: '#ffd60a',
  low: '#8ecae6',
};
