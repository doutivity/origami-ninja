import type { DevlogEntry } from "./types.ts";

export const entry: DevlogEntry = {
  slug: "ink-marsh",
  title: "Ink Marsh: the turtle shell",
  description:
    "Level five of Origami Ninja is a marsh of black ink that slows your run and jump. Hold Attack to fold into a turtle shell that takes one hit.",
  date: "2026-11-07",
  body: `
<p>Paper and water do not mix, and paper and ink mix even worse. In the fifth level the ground is stained with black pools that drag at the ninja's feet.</p>
<h2>Ink</h2>
<p>Inside a pool the ninja runs at about a third of normal speed and jumps barely half as high. Oni patrol the pools and archers shoot across them, so crossing slowly is dangerous.</p>
<h2>The turtle shell</h2>
<p>Hold the attack button on the ground and the ninja folds into a faceted shell. It walks at a steady pace that ink cannot slow, cannot jump, and takes exactly one hit. After that the shell cracks and needs a few seconds before it can be folded again. On a phone this needs no new button: it is the same Attack button, held.</p>
<h2>Checked by the machine</h2>
<p>The tests run the ninja through the ink with the real state machine and compare it with dry ground. They also check the shell: it blocks one hit and not two, it ignores ink, and it cannot jump.</p>
<h2>What comes next</h2>
<p>Paper that can be cut, and a stormy paper sea.</p>
`,
};
