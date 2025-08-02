// Simple Mutex Lock Implementation
export default class Mutex {
  // logic variable describe locked
  private locked = false;
  // array represent waiting queue
  private waitQueue: Array<() => void> = [];

  async lock(): Promise<void> {
    // check if locked is free
    if (this.locked === false) {
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

// usage example
let counter = 0;
let mutex = new Mutex();

const increment = async (arg: number) => {
  counter += arg;
};

const runTasks = async () => {
  const tasks = [10, 5, 2, 3].map((arg) =>
    mutex.withLock(() => increment(arg)),
  );

  await Promise.all(tasks);
  console.log("Final counter:", counter); // should print 20
};

runTasks();

// === Simulate a shared bank account with proper locking ===

let balance = 0;
const mutexBank = new Mutex();

const deposit = async (amount: number, agent: string) => {
  await mutexBank.withLock(async () => {
    const current = balance;
    await new Promise((res) => setTimeout(res, Math.random() * 100)); // simulate network/db delay
    balance = current + amount;
    console.log(`${agent} deposited ${amount}, new balance: ${balance}`);
  });
};

const runDeposits = async () => {
  const tasks = [
    deposit(100, "Agent A"),
    deposit(200, "Agent B"),
    deposit(300, "Agent C"),
    deposit(400, "Agent D"),
  ];

  await Promise.all(tasks);
  console.log("Final balance (with mutex):", balance); // Should be 1000
};

runDeposits();
