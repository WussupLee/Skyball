export class RunTracker {
  constructor(levelCount = 20) {
    this.levelCount = levelCount;
    this.reset();
  }

  start(now) {
    this.startedAt = now;
    this.active = true;
    this.finalTimeMs = 0;
    this.splits = [];
    this.lastSplitElapsed = 0;
  }

  reset() {
    this.startedAt = 0;
    this.active = false;
    this.finalTimeMs = 0;
    this.splits = [];
    this.lastSplitElapsed = 0;
  }

  elapsed(now) {
    return this.active ? Math.max(0, now - this.startedAt) : this.finalTimeMs;
  }

  completeLevel(level, now) {
    if (!this.active || level !== this.splits.length + 1 || level > this.levelCount) return false;
    const elapsed = this.elapsed(now);
    this.splits.push(Math.max(0, elapsed - this.lastSplitElapsed));
    this.lastSplitElapsed = elapsed;
    if (level === this.levelCount) {
      this.finalTimeMs = elapsed;
      this.active = false;
    }
    return true;
  }
}
