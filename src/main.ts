import Mutex from "./mutex";
// Shared mutex
const mutex = new Mutex();

// Shared resource simulation
async function task(name: string, duration: number) {
  await mutex.withLock(async () => {
    console.log(`[${name}] Acquired lock`);
    await new Promise((resolve) => setTimeout(resolve, duration));
    console.log(`[${name}] Released lock`);
  });
}

// Simulate running in parallel
async function main() {
  task("Task A", 2000);
  task("Task B", 1000);
}

main();
