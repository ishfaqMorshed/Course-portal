// ============================================================
// icons.tsx — lucide-style 24×24 line icons, 1.5px stroke.
// Ported 1:1 from the export's icons.jsx.
// ============================================================

import type { CSSProperties, ReactNode } from "react";

export interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

function makeIcon(name: string, children: ReactNode) {
  const C = ({ size = 20, strokeWidth = 1.5, className = "", style = {} }: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
  C.displayName = name;
  return C;
}

export const IconPlay = makeIcon("IconPlay", <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />);
export const IconPlayLine = makeIcon("IconPlayLine", <polygon points="6 3 20 12 6 21 6 3" />);
export const IconPause = makeIcon("IconPause", <g><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" /></g>);
export const IconCheck = makeIcon("IconCheck", <path d="M20 6 9 17l-5-5" />);
export const IconCircle = makeIcon("IconCircle", <circle cx="12" cy="12" r="10" />);
export const IconChevronDown = makeIcon("IconChevronDown", <path d="m6 9 6 6 6-6" />);
export const IconChevronUp = makeIcon("IconChevronUp", <path d="m18 15-6-6-6 6" />);
export const IconChevronLeft = makeIcon("IconChevronLeft", <path d="m15 18-6-6 6-6" />);
export const IconChevronRight = makeIcon("IconChevronRight", <path d="m9 18 6-6-6-6" />);
export const IconDownload = makeIcon("IconDownload", <g><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></g>);
export const IconFileText = makeIcon("IconFileText", <g><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M16 13H8" /><path d="M16 17H8" /></g>);
export const IconBell = makeIcon("IconBell", <g><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></g>);
export const IconSearch = makeIcon("IconSearch", <g><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></g>);
export const IconLogOut = makeIcon("IconLogOut", <g><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></g>);
export const IconMenu = makeIcon("IconMenu", <g><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" /></g>);
export const IconX = makeIcon("IconX", <g><path d="M18 6 6 18" /><path d="m6 6 12 12" /></g>);
export const IconClock = makeIcon("IconClock", <g><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></g>);
export const IconArrowRight = makeIcon("IconArrowRight", <g><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></g>);
export const IconArrowLeft = makeIcon("IconArrowLeft", <g><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></g>);
export const IconMail = makeIcon("IconMail", <g><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></g>);
export const IconZap = makeIcon("IconZap", <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />);
export const IconCheckCircle = makeIcon("IconCheckCircle", <g><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></g>);
export const IconExternalLink = makeIcon("IconExternalLink", <g><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></g>);
export const IconVolume = makeIcon("IconVolume", <g><polygon points="11 5 6 9 2 9 2 13 6 13 11 17 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></g>);
export const IconMaximize = makeIcon("IconMaximize", <g><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></g>);
export const IconBookOpen = makeIcon("IconBookOpen", <g><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></g>);
export const IconTrophy = makeIcon("IconTrophy", <g><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></g>);
export const IconFolder = makeIcon("IconFolder", <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />);
export const IconRotateCcw = makeIcon("IconRotateCcw", <g><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></g>);
export const IconSettings = makeIcon("IconSettings", <g><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></g>);
export const IconUser = makeIcon("IconUser", <g><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></g>);
export const IconTrendUp = makeIcon("IconTrendUp", <g><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></g>);
export const IconCreditCard = makeIcon("IconCreditCard", <g><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></g>);

// Sidebar nav icon: grid is bespoke; book/folder reuse the line icons above.
export function NavIcon({ kind, size = 20 }: { kind: string; size?: number }) {
  if (kind === "grid")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  if (kind === "book") return <IconBookOpen size={size} />;
  if (kind === "folder") return <IconFolder size={size} />;
  return null;
}
