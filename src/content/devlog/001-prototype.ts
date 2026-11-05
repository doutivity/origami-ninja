import type { DevlogEntry } from "./types.ts";

export const entry: DevlogEntry = {
  slug: "prototype",
  title: "Prototype: one mountain and a paper ninja",
  description:
    "The first Origami Ninja prototype: a single mountain level with fire, an enemy, a gap that needs a paper-plane glide, a checkpoint and a finish.",
  date: "2026-11-05",
  body: `
<p>Origami Ninja starts small. The prototype is a single mountain level that fits in two or three screens, but it already has everything the full game is built around.</p>
<h2>What is in the prototype</h2>
<ul>
  <li><strong>Run and jump</strong> with variable jump height, coyote time and an input buffer, on keyboard and on touch screens.</li>
  <li><strong>A sword</strong> that works on the ground and in the air, and a paper enemy that patrols between two points.</li>
  <li><strong>Fire</strong> that slowly burns the paper: a dark edge creeps across the ninja while you stand in the flames.</li>
  <li><strong>A paper-plane glider</strong>: hold jump while falling to fold into a plane, steer the nose up or down, and ride rising wind.</li>
  <li><strong>A gap you cannot cross without gliding</strong>, three checkpoints and a finish gate.</li>
  <li><strong>Death and respawn</strong>: a “You burned” or “You fell” screen, then one key press or tap puts you back at the last checkpoint.</li>
</ul>
<h2>Built to stay at 60 FPS</h2>
<p>Particles live in small fixed pools, the burn effect swaps pre-baked masks instead of redrawing, and the game watches its own frame rate. If the average drops below 55 FPS for two seconds it switches to a lighter quality level automatically: fewer particles, no soft shadows, a lower render resolution. Add <code>?quality=low</code> to the address to force it.</p>
<h2>Everything is drawn in code</h2>
<p>There are no image files in the game. The ninja, the mountains, the flames and even the favicon and social cards are generated from the same shapes and the same colour tokens, so the website and the game always look like one piece of paper.</p>
<h2>What comes next</h2>
<p>The long-term idea is a world that someone is slowly folding. You race towards the centre of the sheet while it shrinks. Water, more origami forms and the folding itself are out of scope for the prototype, but they are the plan.</p>
`,
};
