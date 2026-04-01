# Design System Specification

## 1. Overview & Creative North Star: "The Cognitive Loom"
This design system is engineered to transform the traditional, cluttered study environment into a high-end editorial experience. Moving away from the "utility-first" aesthetic of typical EdTech, we embrace a Creative North Star titled **The Cognitive Loom**. 

This concept treats AI-generated information as a fluid thread that is woven into a structured, architectural space. We reject the "boxed-in" feeling of standard grids in favor of **Intentional Asymmetry** and **Tonal Depth**. By utilizing expansive whitespace and high-contrast typography scales, the UI breathes, reducing cognitive load and positioning the platform as a premium tool for intellectual mastery.

---

## 2. Colors: The Depth of Intelligence
The palette is rooted in deep, cosmic slates, punctuated by a vibrant, "electric" indigo.

### The "No-Line" Rule
To maintain a high-end, seamless feel, **designers are prohibited from using 1px solid borders for sectioning.** Structural boundaries must be defined exclusively through background color shifts or tonal transitions.
- Use `surface_container_low` (#081329) against a `surface` (#060e20) background to define distinct content zones.

### Surface Hierarchy & Nesting
Hierarchy is achieved by "stacking" the surface containers. Instead of flat layouts, treat the UI as layered sheets of obsidian glass:
- **Base Layer:** `surface` (#060e20)
- **Primary Modules:** `surface_container` (#0c1934)
- **Interactive/Nested Elements:** `surface_container_high` (#101e3e)
- **Floating/Active Modals:** `surface_container_highest` (#142449)

### The "Glass & Gradient" Rule
Standard flat colors often feel "out-of-the-box." To elevate the aesthetic:
- **Glassmorphism:** For floating headers or sidebars, use `surface_variant` (#142449) at 70% opacity with a `24px` backdrop-blur. 
- **Signature Gradients:** Main CTAs should utilize a linear gradient (135°) from `primary` (#9392ff) to `primary_dim` (#6462ec) to provide a "pulsing" digital soul.

---

## 3. Typography: Editorial Authority
The type system creates a dialogue between the technical precision of **Space Grotesk** and the humanistic legibility of **Manrope**.

- **Display & Headlines (Space Grotesk):** These are your architectural anchors. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create a bold, authoritative editorial feel. 
- **Titles & Body (Manrope):** Chosen for its high x-height and readability. `body-lg` (1rem) should be used for AI-generated summaries to ensure long-form reading comfort.
- **Hierarchy:** Maintain a dramatic scale difference between headlines and body text. Large, asymmetric headlines (e.g., `headline-lg` at 2rem) should often be paired with significant left-hand margins to create a "white-space-as-structure" effect.

---

## 4. Elevation & Depth: Tonal Layering
Traditional dropshadows are often clumsy. This system utilizes **Ambient Light** and **Tonal Layering**.

- **The Layering Principle:** Place a `surface_container_lowest` (#000000) card on a `surface_container_low` (#081329) background to create a "recessed" focus area. 
- **Ambient Shadows:** For elevated elements (like active AI tooltips), use a 4-layer shadow: `0px 10px 40px rgba(0, 0, 0, 0.4)`. The shadow must never be pure gray; it should be a deep navy tint derived from the background color.
- **The Ghost Border Fallback:** If a boundary is strictly required for accessibility, use the `outline_variant` (#38476d) at **15% opacity**. High-contrast, 100% opaque borders are strictly forbidden.

---

## 5. Components: Fluid Primitives

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_dim`), `on_primary` (#0e0078) text. Roundedness: `md` (0.375rem).
- **Secondary:** Surface-only. Use `surface_container_highest` (#142449) with no border.
- **Tertiary:** Text-only in `primary` (#9392ff), using `spacing-2` horizontal padding for a subtle hover state background.

### Input Fields
- **Styling:** Forgo the bottom line or box border. Use `surface_container_high` (#101e3e) as a solid fill with `spacing-4` (1.4rem) internal padding. 
- **Focus State:** Transition the background to `surface_container_highest` and apply a "Ghost Border" of `primary` at 30% opacity.

### Chips (AI Keywords/Tags)
- **Filter Chips:** `surface_container_low` (#081329) with `label-md` typography.
- **Action Chips:** Use `secondary_container` (#202814) with `on_secondary_container` (#9ea88b) for a sophisticated, muted contrast.

### Cards & Lists
- **Rule:** Absolute prohibition of divider lines.
- **Separation:** Use `spacing-8` (2.75rem) or `spacing-10` (3.5rem) to separate list items. Vertical whitespace is our primary separator.
- **AI Highlight Card:** Use `primary_container` (#7472fd) with 10% opacity as a background to subtly highlight a suggested study path.

---

## 6. Do's and Don'ts

### Do:
- **Embrace Asymmetry:** Align headlines to the left while keeping content blocks slightly offset to create an editorial layout.
- **Use Sub-Pixels:** Use `spacing-0.5` (0.175rem) for fine-tuning the relationship between icons and labels.
- **Nesting Depth:** Always ensure an inner container is a different "Surface Tier" than its parent.

### Don't:
- **Don't use 100% White:** Never use `#FFFFFF`. Always use `on_surface` (#dee5ff) for primary text and `on_surface_variant` (#9baad6) for secondary text to prevent eye strain in dark mode.
- **Don't use standard Shadows:** Avoid the "fuzzy gray" look. Shadows should feel like light being absorbed by dark glass.
- **Don't Crowded the AI:** AI-generated content needs room. If an AI summary is present, increase the surrounding whitespace by 1.5x compared to standard modules.