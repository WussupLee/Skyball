export class RunTracker {
  constructor(levelCount = 20) {
    this.levelCount = levelCount;
    this.reset();
  }

  start(now) {
    this.startedAt = now;
    this.active = true;
    this.pausedAt = null;
    this.finalTimeMs = 0;
    this.splits = [];
    this.lastSplitElapsed = 0;
  }

  reset() {
    this.startedAt = 0;
    this.active = false;
    this.pausedAt = null;
    this.finalTimeMs = 0;
    this.splits = [];
    this.lastSplitElapsed = 0;
  }

  elapsed(now) {
    if (!this.active) return this.finalTimeMs;
    return Math.max(0, (this.pausedAt ?? now) - this.startedAt);
  }

  pause(now) {
    if (!this.active || this.pausedAt !== null) return false;
    this.pausedAt = now;
    return true;
  }

  resume(now) {
    if (!this.active || this.pausedAt === null) return false;
    this.startedAt += Math.max(0, now - this.pausedAt);
    this.pausedAt = null;
    return true;
  }

  completeLevel(level, now) {
    if (!this.active || this.pausedAt !== null || level !== this.splits.length + 1 || level > this.levelCount) return false;
    const elapsed = this.elapsed(now);
    this.splits.push(Math.max(0, elapsed - this.lastSplitElapsed));
    this.lastSplitElapsed = elapsed;
    if (level === this.levelCount) {
      this.finalTimeMs = elapsed;
      this.active = false;
      this.pausedAt = null;
    }
    return true;
  }
}
