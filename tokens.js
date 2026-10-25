/* ══════════════════════════════════════════════════════════════════
   BD design system — values taken from bd-client/src/theme/palette
   and from the Nimbus SummIT 2026 deck.
   ══════════════════════════════════════════════════════════════════ */
export const T = {
  /* brand */
  orange: "#FE7501",        // palette.primary.main — THE brand colour
  orangeSoft: "#FFE2CA",    // primary.light
  orangeTint: "#FFF3E8",
  ink: "#172134",           // palette.black.main
  inkDeep: "#0E1626",

  /* accents */
  blue: "#5877E6",
  blue50: "#E7EEFF",
  blue25: "#EFF4FF",
  teal: "#2EC4B6",
  tealTint: "#E7F8F5",
  green: "#299E46",
  red: "#FF7373",
  redTint: "#FDEEEE",
  purple: "#6C06C5",
  yellow: "#FBD13F",

  /* neutrals */
  white: "#FFFFFF",
  paper: "#F9FAFB",
  grey100: "#F6F6F9",
  grey200: "#E7E8EC",
  grey350: "#CFD4E3",
  grey500: "#ADB4C6",
  grey600: "#9AA2B3",
  grey650: "#6B7280",

  font: "Rubik, system-ui, sans-serif",
  fontEn: "Inter, system-ui, sans-serif",
  ease: "cubic-bezier(0.16, 1, 0.3, 1)",
  radius: 14,
  shadow: "0 30px 80px rgba(23,33,52,0.16), 0 6px 18px rgba(23,33,52,0.06)",
  shadowSoft: "0 2px 10px rgba(23,33,52,0.05)",
};

/* Pillar identity */
export const P = {
  workplan: T.blue,
  meetings: T.teal,
  minutes: T.orange,
  tasks: T.green,
  drive: T.purple,
  roles: T.blue,
  reveal: T.orange,
};
