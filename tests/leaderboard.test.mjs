import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePlayerName, sanitizePlayerNameInput, validatePlayerName } from "../src/leaderboard.js";

test("live name entry preserves a trailing space for multi-word names", () => {
  assert.equal(sanitizePlayerNameInput("SKY "), "SKY ");
  assert.equal(sanitizePlayerNameInput("WASD PILOT"), "WASD PILOT");
});

test("saved names allow spaces and normal letters within the 12-character limit", () => {
  assert.equal(sanitizePlayerName("  WASD PILOT  "), "WASD PILOT");
  assert.equal(sanitizePlayerName("MARBLE RIDER EXTRA"), "MARBLE RIDER");
  assert.equal(validatePlayerName("A W S D"), "");
});
