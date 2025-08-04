// Simple Mutex Lock Implementation
export default class Mutex {
  // logic variable describe locked
  private locked = false;
  // array represent waiting queue
  private waitQueue: Array<() => void> = [];

  async lock(): Promise<void> {
    // check if locked is free
    if (!this.locked) {
      // if lock is free then check it locked
      this.locked = true;
      return;
    }

    // if locked not free then push the caller to waiting queue
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  unlock(): void {
    // check if waiting queue is not empty
    if (this.waitQueue.length > 0) {
      // shift the first callback from waiting queue
      const next = this.waitQueue.shift()!;
      next();
    } else {
      // check locked to be free if there is no waiting queue
      this.locked = false;
    }
  }

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.lock();
    try {
      return await fn();
    } finally {
      this.unlock();
    }
  }
}
