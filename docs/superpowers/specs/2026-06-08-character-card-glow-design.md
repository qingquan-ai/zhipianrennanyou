# Character Card Glow Design

## Goal

Apply the supplied pointer-following glow effect to the character cards on the
home page without changing their content, layout, selection behavior, or the
rest of the page.

## Design

- Add a reusable client component at
  `src/components/ui/glowing-effect.tsx`.
- Keep the supplied pointer tracking and animated angle behavior.
- Use a balanced pink-to-purple gradient, a 2 px border, and a short proximity
  range so the effect is visible without overpowering card content.
- Render the effect as an absolute, pointer-events-none layer inside each
  `CharacterCard`.
- Preserve the existing card click handler, hover shadow, content, and
  responsive grid.

## Animation

Use `requestAnimationFrame` inside the component for angle easing. This keeps
the supplied pointer-following behavior without adding a production dependency.

## Verification

- Run `pnpm.cmd ts-check`.
- Run ESLint for the two changed component files.
- Open the home page and verify that moving the pointer near each card produces
  a smooth directional pink-purple border while clicking still selects the
  character.
