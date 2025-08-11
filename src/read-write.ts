// Read-Write Lock for reader-writer scenarios
export class ReadWriteLock {
  private readers = 0;
  private writer = false;
  private readWaitQueue: Array<() => void> = [];
  private writeWaitQueue: Array<() => void> = [];

  async acquireRead(): Promise<void> {
    if (!this.writer && this.writeWaitQueue.length === 0) {
      this.readers++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.readWaitQueue.push(resolve);
    });
  }

  releaseRead(): void {
    this.readers--;
    if (this.readers === 0 && this.writeWaitQueue.length > 0) {
      this.writer = true;
      const next = this.writeWaitQueue.shift()!;
      next();
    }
  }

  async acquireWrite(): Promise<void> {
    if (!this.writer && this.readers === 0) {
      this.writer = true;
      return;
    }

    return new Promise<void>((resolve) => {
      this.writeWaitQueue.push(resolve);
    });
  }

  releaseWrite(): void {
    this.writer = false;

    // Prioritize waiting writers, then readers
    if (this.writeWaitQueue.length > 0) {
      this.writer = true;
      const next = this.writeWaitQueue.shift()!;
      next();
    } else {
      // Release all waiting readers
      while (this.readWaitQueue.length > 0) {
        this.readers++;
        const next = this.readWaitQueue.shift()!;
        next();
      }
    }
  }

  async withReadLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireRead();
    try {
      return await fn();
    } finally {
      this.releaseRead();
    }
  }

  async withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireWrite();
    try {
      return await fn();
    } finally {
      this.releaseWrite();
    }
  }
}

