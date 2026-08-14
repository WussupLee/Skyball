export const SETTINGS_STORAGE_KEY = "skyball.settings.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  musicVolume: 50,
  sfxVolume: 100,
  sensitivity: 100,
  invertHorizontal: false,
  invertVertical: false,
});

function clampNumber(value, minimum, maximum, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(maximum, Math.max(minimum, numeric)) : fallback;
}

export function normalizeSettings(value = {}) {
  return {
    musicVolume: clampNumber(value.musicVolume, 0, 100, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clampNumber(value.sfxVolume, 0, 100, DEFAULT_SETTINGS.sfxVolume),
    sensitivity: clampNumber(value.sensitivity, 50, 150, DEFAULT_SETTINGS.sensitivity),
    invertHorizontal: value.invertHorizontal === true,
    invertVertical: value.invertVertical === true,
  };
}

export function loadSettings(storage = globalThis.localStorage) {
  try {
    return normalizeSettings(JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) || "{}"));
  } catch {
    return normalizeSettings();
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizeSettings(settings);
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Disabled or full local storage should not interrupt gameplay.
  }
  return normalized;
}
