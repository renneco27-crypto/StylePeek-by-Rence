# Style Peek Studio — Design System (`CTRL+SPC` + `/hallmark` + `ui-laws.txt`)

## 1. Visual Direction & Philosophy
Style Peek Studio unifies all extension surfaces (`popup.html`, the on-page `content.js` Inspector/Layer Studio, and `js/h2d_toolbar.js` Interactive Capture Modal) into the **CTRL+SPC Tactile Mechanical Studio** aesthetic (`CTRL+SPC UI Kit.html`) governed by `ui-laws.txt`.

- **No-Code First**: Plain language (`Step Behind`, `Step In Front`, `This Layer`, `Page Wallpaper`, `Add Picture`) instead of developer jargon.
- **Pass-Through Deep Layer Editing**: Stepping behind front elements automatically sets `pointer-events: none` on overlapping foreground layers so users can drag, resize, recolor, or swap background images on deeper layers without disturbing front elements.
- **Strict Compliance with `ui-laws.txt`**:
  - **Law 1**: Zero emojis anywhere in the UI. All iconography uses clean inline Lucide vector SVGs (`stroke-width="2"`).
  - **Law 2 & 8**: Concise, factual labels with zero marketing fluff.
  - **Law 3**: Warm Cream (`#F4F3EE`) paper surfaces, Warm Stone (`#EAE8E0`) segmented control tracks, Matte Charcoal (`#1C1C1E`) active pills, Coral Red (`#C84B44`) primary CTA, Mint (`#7CE0D3`) active status badges, and 3D PBT Keycap steppers.
  - **Law 4, 4b, 4e, 9**: Bare top-bar icons, one primary Coral CTA per view, segmented controls for mutually exclusive states, and bold clickable text with arrow (`→`) for secondary actions.

## 2. Token Reference (`tokens.css`)
| Token | Value | Role |
| :--- | :--- | :--- |
| `--color-paper` | `#F4F3EE` (`oklch(96.2% 0.009 95)`) | Primary panel & popup canvas |
| `--color-paper-2` | `#EAE8E0` (`oklch(92.8% 0.012 95)`) | Segmented track, secondary pills, hover fill |
| `--color-surface` | `#FAF9F6` (`oklch(99.2% 0.003 95)`) | 3D PBT Keycap button top surface |
| `--color-ink` | `#1C1C1E` (`oklch(22.6% 0.004 286)`) | Primary typography, active segmented pill |
| `--color-ink-2` | `#78716C` (`oklch(55.3% 0.013 58)`) | Muted labels, metadata, dimensions |
| `--color-rule` | `#DCD9CE` (`oklch(88.5% 0.014 95)`) | Hairline dividers & borders |
| `--color-accent` | `#C84B44` (`oklch(56.5% 0.165 25)`) | Single Primary CTA per screen |
| `--color-mint` | `#7CE0D3` (`oklch(83.4% 0.098 184)`) | Active tool status & pass-through layer indicator |
