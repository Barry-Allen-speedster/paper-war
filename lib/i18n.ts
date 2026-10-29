/**
 * Minimal i18n helper.
 * All user-visible strings go through t() — no raw text in JSX.
 * Strings live in public/locales/en.json.
 * Variable interpolation: t("hello", { name: "World" }) with "hello": "Hello, {{name}}!"
 */

// Bundled English strings (avoids a fetch for the default locale)
const en: Record<string, string> = {
  // ── Main Menu ──────────────────────────────────────────────────────────────
  "menu.title": "Paper War",
  "menu.subtitle": "A two-player paper-folding battle",
  "menu.mode.local": "Pass & Play",
  "menu.mode.ai": "Vs AI",
  "menu.mode.online": "Online",
  "menu.difficulty.label": "Difficulty",
  "menu.difficulty.easy": "Easy",
  "menu.difficulty.medium": "Medium",
  "menu.difficulty.hard": "Hard",
  "menu.howToPlay": "How to Play",
  "menu.rules": "Rules",
  "menu.sound.on": "Sound On",
  "menu.sound.off": "Sound Off",
  "menu.theme": "Theme",
  "menu.stats": "Stats",

  // ── Lobby ──────────────────────────────────────────────────────────────────
  "lobby.title": "Online Game",
  "lobby.host.instruction": "Share this code with your opponent",
  "lobby.guest.instruction": "Enter your opponent's code",
  "lobby.code.placeholder": "Enter room code",
  "lobby.copy": "Copy Code",
  "lobby.share": "Share Link",
  "lobby.join": "Join",
  "lobby.ready": "Ready",
  "lobby.waiting": "Waiting for opponent…",
  "lobby.connected": "Connected",
  "lobby.connecting": "Connecting…",
  "lobby.reconnecting": "Reconnecting…",
  "lobby.cancel": "Cancel",
  "lobby.error.collision": "Code in use — trying another…",
  "lobby.error.notFound": "Room not found. Check the code.",
  "lobby.error.timeout": "Connection timed out.",
  "lobby.error.generic": "Connection failed.",

  // ── Deployment ─────────────────────────────────────────────────────────────
  "deploy.title": "Place Your Army",
  "deploy.randomize": "Randomize",
  "deploy.reset": "Reset",
  "deploy.ready": "Ready!",
  "deploy.pass.title": "Pass the device",
  "deploy.pass.subtitle": "Player {{player}}, look away while your opponent deploys.",
  "deploy.pass.tap": "Tap to continue",
  "deploy.tray.label": "Unplaced units",
  "deploy.unit.soldier": "Soldier",
  "deploy.unit.bomber": "Bomber soldier",
  "deploy.unit.queen": "Queen",
  "deploy.unit.king": "King",
  "deploy.invalid": "Invalid position",

  // ── Battlefield ────────────────────────────────────────────────────────────
  "battle.turn": "{{player}}'s Turn",
  "battle.shot": "Shot {{n}} of {{total}}",
  "battle.fire": "Fire!",
  "battle.log.title": "Shot Log",
  "battle.log.hit": "Turn {{turn}}: HIT {{unit}}",
  "battle.log.miss": "Turn {{turn}}: Miss",
  "battle.log.kill": "Turn {{turn}}: KILLED {{unit}}!",
  "battle.log.waste": "Turn {{turn}}: Wasted ink",
  "battle.waiting": "Waiting for opponent…",
  "battle.ai.thinking": "AI is thinking…",
  "battle.pause": "Pause",

  // ── Pass-device screen ─────────────────────────────────────────────────────
  "pass.title": "{{player}}'s Turn",
  "pass.instruction": "Tap to reveal the board",

  // ── Turn handoff ──────────────────────────────────────────────────────────
  "handoff.title": "{{player}}'s Turn",
  "handoff.tap": "Tap to reveal",

  // ── Game Over ──────────────────────────────────────────────────────────────
  "gameover.winner": "{{player}} Wins!",
  "gameover.stats.shots": "Shots fired",
  "gameover.stats.accuracy": "Accuracy",
  "gameover.stats.turns": "Turns",
  "gameover.rematch": "Rematch",
  "gameover.menu": "Main Menu",
  "gameover.cheat": "⚠ Commitment verification failed — possible cheating detected.",
  "gameover.rematch.waiting": "Waiting for opponent…",
  "gameover.rematch.declined": "Opponent declined or left.",

  // ── Rules panel ────────────────────────────────────────────────────────────
  "rules.title": "Rules",
  "rules.shotsPerTurn": "Shots per turn",
  "rules.queenTakesTwo": "Queen takes 2 hits",
  "rules.queenKillSkipsTurn": "Queen kill skips opponent's turn",
  "rules.allUnitsWin": "Win by eliminating all units",

  // ── How to play ────────────────────────────────────────────────────────────
  "howto.title": "How to Play",
  "howto.step1.title": "Deploy your army",
  "howto.step1.body": "Place your 5 Soldiers, 1 Queen, and 1 King on your half of the paper. Keep them secret!",
  "howto.step2.title": "Take turns firing",
  "howto.step2.body": "Drag the reticle to aim at a spot on your opponent's half, then tap Fire.",
  "howto.step3.title": "The paper folds",
  "howto.step3.body": "Your side folds over. The ink presses through — revealing a hit or miss.",
  "howto.step4.title": "Find the King",
  "howto.step4.body": "Destroy the enemy King to win. Misses stay visible as clues.",
  "howto.close": "Got it!",

  // ── Settings ──────────────────────────────────────────────────────────────
  "settings.title": "Settings",
  "settings.theme": "Theme",
  "settings.sound": "Sound",
  "settings.close": "Close",

  // ── Shared ────────────────────────────────────────────────────────────────
  "shared.player1": "Player 1",
  "shared.player2": "Player 2",
  "shared.you": "You",
  "shared.ai": "AI",
  "shared.forfeit": "Forfeit",
  "shared.leave": "Leave",
  "shared.resume": "Resume",
  "shared.disconnect.title": "Opponent disconnected",
  "shared.disconnect.body": "Waiting {{seconds}}s for reconnection…",
  "shared.skip": "Skip",
};

/**
 * Translate a key with optional variable substitution.
 * Unknown keys fall back to the key itself (visible in UI as a clear indicator).
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  let str = en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{{${k}}}`, String(v));
    }
  }
  return str;
}
