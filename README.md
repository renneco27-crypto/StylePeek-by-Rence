<div align="center">

# 🔍 Style Peek Studio
### Visual Inspector, Live Editor, Viewport Extractor & Layer Stacking Studio
**Built for Chrome & Microsoft Edge (Manifest V3)**

[![Version](https://img.shields.io/badge/Version-1.8.5-8B5CF6?style=for-the-badge)](https://github.com/renneco27-crypto/StylePeek-by-Rence)
[![License](https://img.shields.io/badge/License-MIT-00E5CC?style=for-the-badge)](LICENSE)
[![Remote Debugging](https://img.shields.io/badge/Remote_Debug-CDP_Ready-F5A623?style=for-the-badge)](https://github.com/renneco27-crypto/StylePeek-by-Rence)

*Inspect any webpage, restyle text and containers live, reorganize layers like a Word document, and extract exact rendered viewports.*

</div>

---

## 🥞 The Layers Tab Explained (Deep Dive)

The **Layers Tab (`🥞`)** in Style Peek Studio is designed to solve one of the biggest headaches in modern web development: **understanding visual depth, stacking order, and background layers without digging through thousands of lines of nested DOM elements.**

In standard browser DevTools, finding out why an element is behind another or pinpointing what is actually providing the site's background color requires opening the Elements tree and guessing. The **Layers Tab** unifies three critical workflows into a single clean drawer:

```
┌────────────────────────────────────────────────────────┐
│ 🥞 SIMPLIFIED LAYERS STUDIO ARCHITECTURE               │
├────────────────────────────────────────────────────────┤
│ 1. Layer Navigation & Solo View                       │
│    • ⬆ Go Layer Up (Parent)  • ⬇ Go Layer Down (Inside)│
│    • ◂ Layer Behind          • ▸ Layer In Front        │
│    • 🎯 View Only This Layer (Solo View ON/OFF)        │
│    • Interactive Breadcrumb Hierarchy                  │
├────────────────────────────────────────────────────────┤
│ 2. Put Behind / In Front & Stacking Depth              │
│    • ⬇ Put Behind Neighbor   • ⬆ Put in Front          │
│    • ⬇⬇ Send to Back         • ⬆⬆ Bring to Front       │
│    • Z-Index Stepper (+ / −) • 🌐 Canvas Background    │
├────────────────────────────────────────────────────────┤
│ 3. Element Background (Color & Image)                  │
│    • Quick Color Picker & Hex Code                     │
│    • Background Image (URL or 📁 File Upload)          │
│    • Sizing Modes: Cover, Contain, Tile/Repeat, Auto   │
├────────────────────────────────────────────────────────┤
│ 4. Layer Creation & Power Tools                        │
│    • 💻 Edit Layer Code      • 📷 Make into Image      │
│    • ➕ Put Element on Layer: Text, Card, Picture      │
└────────────────────────────────────────────────────────┘
```

---

### 1. Stacking & Depth Controls (Word-Style Stacking)

Modern CSS makes stacking order confusing because of CSS Stacking Contexts (caused by `opacity`, `transform`, `filter`, or `z-index` with `position`). Changing `z-index` often does nothing if the element is inside another stacking context or has `position: static`.

Style Peek handles this under the hood with 3 one-click actions:

* **⬇ Send to Back (Word-Document Style)**:
  * Ensures the element has `position: relative`.
  * Sets `z-index: -999999 !important`.
  * Moves the element to `parentElement.insertBefore(el, parentElement.firstChild)`.
  * *Use case*: When you insert a background image or custom shape and want all text, cards, and buttons in that section to sit comfortably on top of it.
* **⬆ Bring to Front**:
  * Ensures the element has `position: relative`.
  * Sets `z-index: 2147483640 !important` and appends it to the end of the container.
  * *Use case*: When a modal, dropdown, floating banner, or badge is trapped behind another card or header.
* **🌐 To Canvas BG**:
  * Extends the element to `position: fixed; width: 100vw; height: 100vh; top: 0; left: 0; object-fit: cover; z-index: -999999`.
  * Moves it to the very bottom of `document.body`.
  * *Use case*: Turns any photo, SVG pattern, or video into the entire site's full-screen wallpaper background.
* **Z-Index Stepper (`+` / `−`)**:
  * Nudges the exact `z-index` value up or down by 1 with automatic `position: relative` safeguarding.

---

### 2. DOM Relatives Context (No Clutter, Relatives Only)

Previous tools and older versions dumped 20+ ancestor wrapper `<div>`s horizontally across the screen, creating an unusable horizontal scrollbar and trapping clicks. 

Style Peek v1.7.0 replaces this with **DOM Relatives Context**, showing only the immediate relatives relevant to your current design focus:

* **⬆ Parent**:
  * Shows the immediate parent wrapper (e.g. `div.flex`, `section.hero`).
  * Clicking the chip instantly selects the parent container so you can style its padding, fill, or layout.
* **🎯 Current Layer**:
  * Displays the selected tag name, primary class, and rendered pixel dimensions (e.g. `div.relative (953×44)`).
  * Includes two instant productivity toggles:
    * **👁️ Visibility Toggle**: Hides or shows the element live (`visibility: hidden`) to see what the layout looks like without it.
    * **🎯 Solo Isolate Toggle**: Temporarily hides all sibling cards in the same container, isolating only this card on your canvas so you can edit it without visual distractions.
* **⇄ Siblings (Neighbors)**:
  * Shows clickable chips for the neighboring cards, columns, or list items directly adjacent to your selection.
  * Lets you jump between sibling cards in 1 click without accidentally misclicking the canvas.
* **⬇ Inside (Children / Inner Letters)**:
  * Shows the direct children inside your element (inner text blocks, buttons, icons).
  * Clicking an inner chip lets you zoom straight into the typography or buttons inside a container.
* **▾ Collapsible Full Ancestor Tree**:
  * If you ever need to inspect the root hierarchy (`<html>`, `<body>`, `<main>`), click to expand the full ancestor chain without cluttering the default view.

---

### 3. Background Pinpointing & HTML Themes

When you want to change a website's background color, clicking on the canvas often selects a child card, a paragraph, or a transparent grid overlay instead of the actual background.

The **Pinpoint Backgrounds** engine solves this automatically:
* As soon as an element is selected, Style Peek walks up the DOM hierarchy and detects **every layer that has an opaque background color or background image**.
* Detects:
  1. **Root Theme (`<html>`)**: The root document color.
  2. **Document Canvas (`<body>`)**: The primary site canvas fill.
  3. **Container Wrappers**: Any ancestor `div` or `section` with an explicit background fill.
* Shows a visual swatch, hex value, and copy button for each detected layer.
* **Theme Background Row**: Enter any hex code or pick a color with the native eyedropper, then click **Apply Theme** to synchronously update both `<html>` and `<body>` across the entire website.
* **🖼️ Custom Background Image**: Apply any image URL or upload a local image file directly to the **Selected Layer**, **Body Canvas**, or **Root HTML**. Supports **Cover**, **Contain**, **Repeat / Tile**, and **Original Size** modes with instant live rendering and undo/redo support.

---

### 4. Interactive Live Manipulation & Edge Autoscroll

* **Smooth Viewport Edge Autoscroll**: When dragging elements toward the top or bottom edge of the screen, Style Peek continuously autoscrolls the viewport with proportional speed so you can move elements anywhere across long web pages without getting stuck at the edge.
* **Smart Media vs Text Detection**: Images, SVGs, canvas, and video elements are automatically distinguished from text blocks. Media elements retain grab cursors and immediate dragability without accidentally activating inline text editing.
* **Instant Live Image Replacement**: When selecting an existing `<img>` on the live site, inserting an image automatically and immediately replaces the image `.src` directly on the webpage without waiting or clone-only preview replacement.

---

## 🚀 Key Features

* **🎨 Deep Text & Fill Styling Engine**:
  * Deeply cascades text colors (`color: col !important`) to all descendant text nodes (`span`, `p`, `a`, `h1`-`h6`, `div`, etc.) and SVG icon fills, bypassing aggressive Tailwind specificity resets.
  * Multi-layer border engine injects CSS `border`, `outline`, and `box-shadow` rings so borders never get obscured by child backgrounds.
* **➕ Add Custom Elements**:
  * Insert custom images from URL or local file, draggable div boxes, or raw HTML snippets.
  * Drag corners to stretch/resize, or use **⬇ Send to Back** to make them section backgrounds.
* **💻 Code & Morph Studio**:
  * Real-time dual-pane editor (State A & State B) with GSAP timeline generator.
  * Live isolated component preview sandbox.
  * Strict CSP compliance (zero `eval` or `new Function`).
* **📸 Single Slide & Viewport Site Extractor (`Alt+C`)**:
  * Captures the exact rendered slide, viewport, and page content cleanly as standalone HTML/CSS without automated crawler disruption.
* **📐 Word-Style Snap Margins & Magnetic Alignment Guides**:
  * Free-dragging elements features magnetic snapping to starting origin and parent container margins with visual cyan dashed guidelines.
  * Accidental nudges effortlessly snap right back to their original position.
* **↩️ Dedicated Undo Actions**:
  * One-click **↩ Undo** button on both the floating dock (`#sp-dock-undo`) and drawer header (`#sp-btn-undo`), plus <kbd>Ctrl+Z</kbd>.
  * Instantly reverts moves, word edits, deletions, resizes, background changes, and HTML modifications.
* **✏️ Word Document-Style Text & Multi-Font Preservation**:
  * Double-clicking text targets exact leaf spans and containers without destroying sibling styling.
  * Typing past elements with different fonts automatically inherits their font family, size, weight, and color.
  * Pressing <kbd>Enter</kbd> creates a new line `<div>` inheriting the exact computed font attributes of the line.
  * All single-letter shortcuts (<kbd>A</kbd>, <kbd>M</kbd>, <kbd>C</kbd>, etc.) are strictly suppressed while editing words, preventing modal popups.
* **🔒 Target Lock & Misclick Protection**:
  * Protects selected elements from accidental canvas misclicks while editing in the drawer.
  * Immediate selection pass-through for children inside the active target.

---

## 🛠️ Installation & Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/renneco27-crypto/StylePeek-by-Rence.git
   ```
2. Open Microsoft Edge or Google Chrome and navigate to `edge://extensions/` or `chrome://extensions/`.
3. Enable **Developer mode** (toggle in top-right or sidebar).
4. Click **Load unpacked** and select the folder `StylePeek-by-Rence-master`.
5. Pin the **Style Peek Studio** extension to your toolbar.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Tool / Action | Description |
| :--- | :--- | :--- |
| <kbd>I</kbd> | **Inspect Mode** | Hover outline and click to select any element |
| <kbd>M</kbd> | **Move Mode** | Drag and reposition elements freely on canvas |
| <kbd>R</kbd> | **Resize Mode** | Stretch corner handles to resize containers |
| <kbd>C</kbd> | **Style Drawer** | Open colors, typography, background fills, and borders |
| <kbd>L</kbd> | **Layers Drawer** | Open depth stacking, DOM Relatives, and background pinpointer |
| <kbd>K</kbd> | **Code Studio** | Open live code editor, preview sandbox, and morphing |
| <kbd>A</kbd> | **Add Element** | Open modal to insert photos, divs, or custom HTML |
| <kbd>D</kbd> | **Delete Mode** | Click any element to remove from page |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | **Undo** | Undo last move, deletion, or insertion |
| <kbd>Alt</kbd> + <kbd>C</kbd> | **Extract Viewport** | Download self-contained rendered viewport HTML |
| <kbd>Esc</kbd> | **Close / Deselect** | Close drawer or deselect active target |

---

## 👨‍💻 Author

<div align="center">

**Lawrence Cortes**  
*Full-Stack Developer · Builder · Tinkerer*  
[dev.lawrencecortes.flashhub.net](https://dev.lawrencecortes.flashhub.net)

Built with 🇺🇸 + 🇵🇭 energy · From Cebu to the world.

</div>
