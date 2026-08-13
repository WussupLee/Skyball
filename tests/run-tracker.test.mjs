import assert from "node:assert/strict";
import test from "node:test";
import { RunTracker } from "../src/run-tracker.js";

test("tracks one authoritative Level 1 through Level 20 run", () => {
  const tracker = new RunTracker(20);
  tracker.start(1000);

  let now = 1000;
  for (let level = 1; level <= 20; level += 1) {
    now += 4250 + level * 37;
    assert.equal(tracker.completeLevel(level, now), true);
    // Time spent on result transitions remains in the continuous run clock.
    if (level < 20) now += 550;
  }

  assert.equal(tracker.active, false);
  assert.equal(tracker.splits.length, 20);
  assert.equal(tracker.finalTimeMs, now - 1000);
  assert.equal(tracker.splits.reduce((sum, split) => sum + split, 0), tracker.finalTimeMs);
  assert.equal(tracker.completeLevel(20, now + 1000), false);
});

test("rejects duplicate or out-of-order level completions", () => {
  const tracker = new RunTracker(20);
  tracker.start(0);
  assert.equal(tracker.completeLevel(2, 5000), false);
  assert.equal(tracker.completeLevel(1, 5000), true);
  assert.equal(tracker.completeLevel(1, 6000), false);
  assert.deepEqual(tracker.splits, [5000]);
});
