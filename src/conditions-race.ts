// Simple Mutex Lock Implementation
class Mutex {
  private locked = false;
  private waitQueue: Array<() => void> = [];

  async lock(): Promise<void> {
    if (this.locked === false) {
      this.locked = true;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  unlock(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift()!;
      next();
    } else {
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

// Semaphore for limiting concurrent access
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift()!;
      next();
    } else {
      this.permits++;
    }
  }

  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

// Read-Write Lock for reader-writer scenarios
class ReadWriteLock {
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

// Usage Examples
class BankAccount {
  private balance = 0;
  private mutex = new Mutex();

  async deposit(amount: number): Promise<void> {
    await this.mutex.withLock(async () => {
      const currentBalance = this.balance;
      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 10));
      this.balance = currentBalance + amount;
      console.log(`Deposited ${amount}, new balance: ${this.balance}`);
    });
  }

  async withdraw(amount: number): Promise<boolean> {
    return this.mutex.withLock(async () => {
      if (this.balance >= amount) {
        const currentBalance = this.balance;
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        this.balance = currentBalance - amount;
        console.log(`Withdrew ${amount}, new balance: ${this.balance}`);
        return true;
      }
      return false;
    });
  }

  getBalance(): number {
    return this.balance;
  }
}

// Rate limiter using semaphore
class RateLimiter {
  private semaphore: Semaphore;

  constructor(maxConcurrent: number) {
    this.semaphore = new Semaphore(maxConcurrent);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.semaphore.withPermit(fn);
  }
}

// Cache with read-write lock
class ThreadSafeCache<K, V> {
  private cache = new Map<K, V>();
  private rwLock = new ReadWriteLock();

  async get(key: K): Promise<V | undefined> {
    return this.rwLock.withReadLock(async () => {
      return this.cache.get(key);
    });
  }

  async set(key: K, value: V): Promise<void> {
    await this.rwLock.withWriteLock(async () => {
      this.cache.set(key, value);
    });
  }

  async delete(key: K): Promise<boolean> {
    return this.rwLock.withWriteLock(async () => {
      return this.cache.delete(key);
    });
  }

  async has(key: K): Promise<boolean> {
    return this.rwLock.withReadLock(async () => {
      return this.cache.has(key);
    });
  }
}

// Example usage
async function demonstrateUsage() {
  console.log("=== Bank Account Example ===");
  const account = new BankAccount();

  // Simulate concurrent deposits and withdrawals
  const operations = [
    account.deposit(100),
    account.deposit(50),
    account.withdraw(30),
    account.deposit(25),
    account.withdraw(20),
  ];

  await Promise.all(operations);
  console.log(`Final balance: ${account.getBalance()}`);

  console.log("\n=== Rate Limiter Example ===");
  const rateLimiter = new RateLimiter(2); // Max 2 concurrent operations

  const tasks = Array.from({ length: 5 }, (_, i) =>
    rateLimiter.execute(async () => {
      console.log(`Task ${i + 1} started`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`Task ${i + 1} completed`);
      return i + 1;
    }),
  );

  await Promise.all(tasks);

  console.log("\n=== Thread-Safe Cache Example ===");
  const cache = new ThreadSafeCache<string, number>();

  await cache.set("key1", 100);
  await cache.set("key2", 200);

  const [value1, value2] = await Promise.all([
    cache.get("key1"),
    cache.get("key2"),
  ]);

  console.log(`Retrieved values: ${value1}, ${value2}`);
}

// Run the demonstration
// demonstrateUsage().catch(console.error);
