// index.ts

import { SafeBankAccount } from "./bank-account.js";

async function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function testBankAccounts() {
  const alice = new SafeBankAccount("Alice");
  const bob = new SafeBankAccount("Bob");
  const charlie = new SafeBankAccount("Charlie");

  console.log("\n🟢 Initial Deposits");
  console.log((await alice.deposit(200)).text);
  console.log((await bob.deposit(100)).text);
  console.log((await charlie.deposit(300)).text);

  console.log("\n🔁 Valid Transfers");
  console.log((await alice.transferTo(bob, 50)).text); // Alice → Bob
  console.log((await bob.transferTo(charlie, 25)).text); // Bob → Charlie
  console.log((await charlie.transferTo(alice, 75)).text); // Charlie → Alice

  console.log("\n❌ Invalid Deposits / Withdrawals");
  console.log((await alice.deposit(0)).text); // Invalid deposit
  console.log((await bob.withdraw(-20)).text); // Invalid withdraw
  console.log((await bob.withdraw(500)).text); // Insufficient funds

  console.log("\n🔄 Transfer to Self");
  console.log((await alice.transferTo(alice, 10)).text); // Should technically work

  console.log("\n🔄 Concurrent Withdrawals from Same Account");
  const withdraw1 = alice.withdraw(60); // Start 1st withdraw
  const withdraw2 = alice.withdraw(80); // Start 2nd withdraw
  const [res1, res2] = await Promise.all([withdraw1, withdraw2]);
  console.log(res1.text);
  console.log(res2.text);

  console.log("\n🔁 Concurrent Transfers");
  const transfer1 = charlie.transferTo(bob, 100);
  const transfer2 = charlie.transferTo(alice, 150);
  const [t1, t2] = await Promise.all([transfer1, transfer2]);
  console.log(t1.text);
  console.log(t2.text);

  console.log("\n📊 Final Balances");
  console.log(`Alice: ${alice.getBalance()}`);
  console.log(`Bob: ${bob.getBalance()}`);
  console.log(`Charlie: ${charlie.getBalance()}`);
}

testBankAccounts();
