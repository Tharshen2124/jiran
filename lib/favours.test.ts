import assert from "node:assert/strict";
import { test } from "node:test";
import { accept, seed, setStatus } from "./favours.ts";

test("accept: only once, never your own", () => {
  const s = seed();
  assert.throws(() => accept("f3", "u1", s), /own favour/);
  accept("f1", "u1", s);
  assert.throws(() => accept("f1", "u3", s), /already accepted/);
  assert.equal(s.favours.find((f) => f.id === "f1")!.helperId, "u1");
});

test("status: only helper, only valid transitions, points on completion", () => {
  const s = seed();
  accept("f2", "u1", s);
  assert.throws(() => setStatus("f2", "u2", "in_progress", s), /Only the helper/);
  assert.throws(() => setStatus("f2", "u1", "completed", s), /Can't move/);
  setStatus("f2", "u1", "in_progress", s);
  setStatus("f2", "u1", "completed", s);
  assert.equal(s.points.u1, 15 + 20);
  assert.throws(() => setStatus("f2", "u1", "cancelled", s), /Can't move/);
});
