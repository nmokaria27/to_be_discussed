import {
  Accessibility,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Database,
  Inbox,
  Info,
  Languages,
  Link2,
  MousePointerClick,
  RefreshCw,
  ShieldOff,
  Shuffle,
  Smartphone,
  Snail,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import type { Severity } from '@swarm/shared';

/** Real iconography per persona (lucide) — keyed to the C8 catalog. No emoji. */
const PERSONA_ICON: Record<string, LucideIcon> = {
  rage_tapper: MousePointerClick,
  offline_commuter: WifiOff,
  power_user_10k: Database,
  long_name_rtl: Languages,
  accessibility: Accessibility,
  tiny_screen: Smartphone,
  slow_network: Snail,
  empty_state: Inbox,
  permission_denier: ShieldOff,
  background_resume: RefreshCw,
  deep_link: Link2,
  rapid_switcher: Shuffle,
};

export function personaIcon(key: string): LucideIcon {
  return PERSONA_ICON[key] ?? Smartphone;
}

export interface SeverityStyle {
  color: string;
  label: string;
  Icon: LucideIcon;
}

export const SEVERITY: Record<Severity, SeverityStyle> = {
  critical: { color: '#ff3b30', label: 'Critical', Icon: AlertOctagon },
  high: { color: '#ff9500', label: 'High', Icon: AlertTriangle },
  medium: { color: '#ffb300', label: 'Medium', Icon: AlertCircle },
  low: { color: '#8e8e93', label: 'Low', Icon: Info },
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: SEVERITY.critical.color,
  high: SEVERITY.high.color,
  medium: SEVERITY.medium.color,
  low: SEVERITY.low.color,
};
