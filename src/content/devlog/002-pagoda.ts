import type { DevlogEntry } from "./types.ts";

export const entry: DevlogEntry = {
  slug: "burning-pagoda",
  title: "Bamboo River and the Burning Pagoda",
  description:
    "Origami Ninja grows to three levels: a bamboo river with a paper boat, and a vertical Burning Pagoda with a frog leap, archers, falling beams and a wall of fire that climbs after you.",
  date: "2026-11-06",
  body: `
<p>The prototype was one mountain. Now there are three levels, and each one adds a new way to be a piece of paper.</p>
<h2>Bamboo River: the paper boat</h2>
<p>Paper and water do not mix. Touch a river and the ninja folds into a little boat that rides the current. Push into the bank, or press jump, and the boat unfolds so you can climb out. The river also carries you across gaps that a plain jump cannot clear.</p>
<h2>Burning Pagoda: climbing</h2>
<p>The third level turns the game on its side. It is a tall pagoda you climb from the bottom, jumping up through the eaves. A wall of fire creeps up from below, so you cannot stop for long.</p>
<ul>
  <li><strong>The frog leap.</strong> Hold jump on the ground and the ninja folds into a crouching frog. The longer you charge, the higher the leap. Some ledges are too high for a normal jump, so the frog is not optional.</li>
  <li><strong>Archers</strong> turn towards you, draw the bow for a moment as a warning, and shoot fire arrows. A sword swing knocks an arrow out of the air.</li>
  <li><strong>Falling beams.</strong> Burning rafters flicker for a moment and then drop. The warning gives you time to step aside.</li>
  <li><strong>One-way eaves.</strong> You can jump up through a roof edge and land on top of it.</li>
</ul>
<h2>Checked by the machine</h2>
<p>A vertical level is easy to break: one ledge a few pixels too high and the level cannot be finished. The level validator now simulates the jump physics and checks that the finish can be reached with the frog leap and cannot be reached without it. If a ledge is moved out of range, the tests fail.</p>
<h2>What comes next</h2>
<p>Night canyons for glider mastery, more forms and, eventually, the folding sheet itself.</p>
`,
};
