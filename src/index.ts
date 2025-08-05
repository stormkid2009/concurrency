// index.ts

import { SafeBankAccount } from "./bank-account.js";

async function testBankProcess() {
  const alice = new SafeBankAccount("Alice");
  const bob = new SafeBankAccount("Bob");

  // 1. Deposit
  const dep1 = await alice.deposit(100);
  console.log(dep1.text);

  const dep2 = await bob.deposit(50);
  console.log(dep2.text);

  // 2. Withdraw
  const wd1 = await alice.withdraw(30);
  console.log(wd1.text);

  // 3. Transfer
  const tf1 = await alice.transferTo(bob, 50);
  console.log(tf1.text);

  // 4. Failed withdraw
  const wd2 = await bob.withdraw(200);
  console.log(wd2.text);

  // 5. Final balances
  console.log(`Final balance of Alice: ${alice.getBalance()}`);
  console.log(`Final balance of Bob: ${bob.getBalance()}`);
}

testBankProcess();
