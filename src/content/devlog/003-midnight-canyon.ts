import type { DevlogEntry } from "./types.ts";

export const entry: DevlogEntry = {
  slug: "midnight-canyon",
  title: "Midnight Canyon: learning to fly",
  description:
    "Level four of Origami Ninja is a night canyon built around the paper glider: thermal rings, cold downdrafts, a weathervane that calls the wind, and paper cranes that dive at you.",
  date: "2026-11-07",
  body: `
<p>The first three levels gave the ninja fire, water and height. The fourth goes back to the glider and asks you to actually fly it.</p>
<h2>The wind has moods</h2>
<ul>
  <li><strong>Thermal rings</strong> kick the glider forward. The boost fades slowly, so one ring carries you a long way past it.</li>
  <li><strong>Cold downdrafts</strong> pull you down. They cost height, never health, but over a canyon height is life.</li>
  <li><strong>The weathervane.</strong> One tunnel of rising air is asleep until you hit the weathervane with your sword. Without it the second gap cannot be crossed at all.</li>
</ul>
<h2>Paper cranes</h2>
<p>Cranes hang in the air and sway. When you glide beneath one it flaps faster as a warning, then dives at the spot where you were. A single sword hit folds it up for good.</p>
<h2>Checked by the machine</h2>
<p>The glider tests fly the level with the same state machine the game uses. They check that the rings are needed on the first gap, that the second gap cannot be crossed until the weathervane is struck, and that gliding without touching the tilt keys still works, because that is all a phone has.</p>
<h2>What comes next</h2>
<p>More forms, ink and paper-cutting, and eventually the folding sheet itself.</p>
`,
};
