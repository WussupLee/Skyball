import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings } from "../src/settings.js";

test("normalizes saved audio and control settings", () => {
  assert.deepEqual(normalizeSettings({
    musicVolume: 125,
    sfxVolume: -8,
    sensitivity: 135,
    invertHorizontal: true,
    invertVertical: false,
  }), {
    musicVolume: 100,
    sfxVolume: 0,
    sensitivity: 135,
    invertHorizontal: true,
    invertVertical: false,
  });
});

test("persists settings and recovers defaults from invalid storage", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  saveSettings({ ...DEFAULT_SETTINGS, musicVolume: 35, invertVertical: true }, storage);
  assert.equal(loadSettings(storage).musicVolume, 35);
  assert.equal(loadSettings(storage).invertVertical, true);
  values.set("skyball.settings.v1", "not json");
  assert.deepEqual(loadSettings(storage), DEFAULT_SETTINGS);
});
