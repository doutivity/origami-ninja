import type { DevlogEntry } from "./types.ts";

export const entry: DevlogEntry = {
  slug: "kirigami-workshop",
  title: "Kirigami Workshop: cutting the world",
  description:
    "Level six of Origami Ninja is a paper workshop where walls can be cut: the sword takes thin paper, and a shuriken dash takes thick walls, wide gaps and arrows.",
  date: "2026-11-07",
  body: `
<p>Until now the world was something to run across. In the workshop it is something you can cut.</p>
<h2>Paper walls</h2>
<p>Walls of patterned paper block the way. A sword swing cuts a thin one, and it drops away. Thick walls with a red cross brace do not care about the sword.</p>
<h2>The shuriken dash</h2>
<p>Double-tap the attack button and the ninja curls into a spinning star and shoots forward for a moment. The dash cuts thick walls, carries you across a gap that a jump cannot clear on its own, and passes straight through arrows. After a dash there is a short pause, and in the air you get one dash until you land. On a phone it is the same Attack button, tapped twice.</p>
<h2>No glider indoors</h2>
<p>The workshop is closed, so holding jump in the air does nothing. Without that rule the glider would simply fly over the gaps and make the dash pointless.</p>
<h2>Checked by the machine</h2>
<p>The tests jump the gaps with the real state machine. A plain jump never makes it. A jump with a dash at the top does, from a comfortable stretch of ground before the edge. They also check that the sword cannot cut a thick wall and that the dash can.</p>
<h2>What comes next</h2>
<p>A stormy paper sea, and a quiet last level that folds back into the first.</p>
`,
};
