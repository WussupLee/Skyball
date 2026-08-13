const STORAGE_KEY = "skyball.player.v1";
const RUNS_PER_PAGE = 50;
const GAME_VERSION = "1.0.0";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const leaderboardConfigured = Boolean(supabaseUrl && supabaseKey);

export function formatRunTime(milliseconds) {
  const safe = Math.max(0, Math.floor(milliseconds));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const hundredths = Math.floor((safe % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

export function sanitizePlayerName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^A-Za-z0-9 _.-]/g, "")
    .slice(0, 12);
}

export function validatePlayerName(value) {
  const clean = sanitizePlayerName(value);
  if (clean.length < 3 || clean.length > 12) return "Use 3–12 characters.";
  if (!/[A-Za-z0-9]/.test(clean)) return "Include at least one letter or number.";
  return "";
}

function createPlayer() {
  return {
    publicPlayerId: crypto.randomUUID(),
    displayName: "",
    personalBest: null,
    bestSplits: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadLocalPlayer() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.publicPlayerId) return { ...createPlayer(), ...stored };
  } catch {
    // A corrupt or disabled local store should never stop gameplay.
  }
  const player = createPlayer();
  saveLocalPlayer(player);
  return player;
}

export function saveLocalPlayer(player) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...player, updatedAt: new Date().toISOString() }));
  } catch {
    // Private browsing may reject storage. The in-memory identity still works.
  }
}

export function updateLocalBest(player, totalTimeMs, splits) {
  const isPersonalBest = !Number.isFinite(player.personalBest) || totalTimeMs < player.personalBest;
  if (isPersonalBest) {
    player.personalBest = totalTimeMs;
    player.bestSplits = [...splits];
    saveLocalPlayer(player);
  }
  return isPersonalBest;
}

async function request(path, options = {}) {
  if (!leaderboardConfigured) throw new Error("LEADERBOARD_NOT_CONFIGURED");
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`LEADERBOARD_${response.status}`);
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

export async function fetchLeaderboard(tab = "monthly", page = 1) {
  const rows = await request("rpc/get_skyball_leaderboard", {
    method: "POST",
    body: JSON.stringify({
      p_period: tab === "monthly" ? "monthly" : "all-time",
      p_offset: Math.max(0, page - 1) * RUNS_PER_PAGE,
      p_limit: RUNS_PER_PAGE,
    }),
  });
  return rows.map((row) => ({
    rank: row.rank,
    displayName: row.display_name,
    publicPlayerId: row.public_player_id,
    totalTimeMs: row.total_time_ms,
    completedAt: row.completed_at,
  }));
}

export async function submitRun(player, totalTimeMs, levelSplits) {
  const result = await request("rpc/submit_skyball_run", {
    method: "POST",
    body: JSON.stringify({
      p_public_player_id: player.publicPlayerId,
      p_display_name: player.displayName,
      p_total_time_ms: Math.round(totalTimeMs),
      p_level_splits: levelSplits.map((split) => Math.round(split)),
      p_game_version: GAME_VERSION,
    }),
  });
  return Array.isArray(result) ? result[0] : result;
}

export async function updateRemoteName(player) {
  return request("rpc/update_skyball_player_name", {
    method: "POST",
    body: JSON.stringify({
      p_public_player_id: player.publicPlayerId,
      p_display_name: player.displayName,
    }),
  });
}

export async function fetchPersonalBest(player) {
  if (!player.displayName) return null;
  const rows = await request("rpc/get_skyball_personal_best", {
    method: "POST",
    body: JSON.stringify({ p_public_player_id: player.publicPlayerId }),
  });
  if (!rows.length) return null;
  return {
    total_time_ms: rows[0].total_time_ms,
    level_splits: rows[0].level_splits,
    completed_at: rows[0].completed_at,
    allTimeRank: rows[0].all_time_rank,
    monthlyRank: rows[0].monthly_rank,
  };
}

export function currentMonthLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date).toUpperCase();
}

export { GAME_VERSION, RUNS_PER_PAGE };
