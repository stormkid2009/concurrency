// we add .js extension here to avoid typescript complains as at run time it needs to know the type of file.
import SafeBankAccount from "./bank-account.js";

async function runTasks() {
  const accountA = new SafeBankAccount("Ahmed Ali", 1000);
  const accountB = new SafeBankAccount("Farah Anwar", 500);

  // Run multiple operations in parallel
  await Promise.all([
    accountA.deposit(100),
    accountB.deposit(200),

    accountA.deposit(300),
    accountB.deposit(400),

    accountA.withdraw(200),
    accountB.withdraw(300),
  ]);

  //console.log(`\nFinal Balance of A: $${await accountA.getBalance()}`);
  //console.log(`Final Balance of B: $${await accountB.getBalance()}`);
}

//runTasks().catch(console.error);

const accounts = [
  new SafeBankAccount("Alice", 1000),
  new SafeBankAccount("Bob", 1000),
  new SafeBankAccount("Charlie", 1000),
  new SafeBankAccount("Diana", 1000),
];

const randomTransfer = async () => {
  const senderIndex = Math.floor(Math.random() * accounts.length);
  let receiverIndex;
  do {
    receiverIndex = Math.floor(Math.random() * accounts.length);
  } while (receiverIndex === senderIndex);

  const amount = Math.floor(Math.random() * 200); // up to $199
  const sender = accounts[senderIndex]!;
  const receiver = accounts[receiverIndex]!;

  await sender.transferTo(receiver, amount);
};

const simulateTransfers = async (count: number) => {
  const transfers = [];
  for (let i = 0; i < count; i++) {
    transfers.push(randomTransfer());
  }
  await Promise.all(transfers);
};

// Run simulation
(async () => {
  console.log("💸 Starting transfer simulation...\n");

  await simulateTransfers(100); // simulate 100 parallel transfers

  console.log("\n📊 Final account balances:");
  for (const acc of accounts) {
    console.log(`${acc['name']}: $${await acc.getBalance()}`);
  }

  const total = (
    await Promise.all(accounts.map(acc => acc.getBalance()))
  ).reduce((sum, b) => sum + b, 0);

  console.log(`\n🧮 Total money in system: $${total}`);
})();

