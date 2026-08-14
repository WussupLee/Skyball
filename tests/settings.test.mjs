import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings } from "../src/settings.js";

test("normalizes saved audio and control settings", () => {
  assert.deepEqual(normalizeSettings({
    musicVolume: 125,
    sfxVolume: -8,
    sensitivity: 135,
    invertControls: true,
  }), {
    musicVolume: 100,
    sfxVolume: 0,
    sensitivity: 135,
    invertControls: true,
  });
});

test("persists settings and recovers defaults from invalid storage", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  saveSettings({ ...DEFAULT_SETTINGS, musicVolume: 35, invertControls: true }, storage);
  assert.equal(loadSettings(storage).musicVolume, 35);
  assert.equal(loadSettings(storage).invertControls, true);
  values.set("skyball.settings.v1", "not json");
  assert.deepEqual(loadSettings(storage), DEFAULT_SETTINGS);
});

test("migrates either legacy axis inversion into the unified control", () => {
  assert.equal(normalizeSettings({ invertHorizontal: true }).invertControls, true);
  assert.equal(normalizeSettings({ invertVertical: true }).invertControls, true);
});
