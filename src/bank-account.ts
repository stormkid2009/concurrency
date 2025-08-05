// bank-account.ts

import Mutex from "./mutex.js";
import { Message, Messages } from "./types.js";

export class SafeBankAccount {
  private balance = 0;
  private readonly mutex = new Mutex();

  constructor(public readonly name: string) {}

  async deposit(amount: number): Promise<Message> {
    console.log(Messages.deposit.attempt(amount, this.name));

    if (amount <= 0) {
      return Messages.deposit.failure("Amount must be greater than 0");
    }

    await this.mutex.withLock(async () => {
      this.balance += amount;
    });

    return Messages.deposit.success(amount, this.name);
  }

  async withdraw(amount: number): Promise<Message> {
    console.log(Messages.withdraw.attempt(amount, this.name));

    if (amount <= 0) {
      return Messages.withdraw.failure("Amount must be greater than 0");
    }

    return await this.mutex.withLock(async () => {
      if (this.balance < amount) {
        return Messages.withdraw.failure("Insufficient funds");
      }

      this.balance -= amount;
      return Messages.withdraw.success(amount, this.name);
    });
  }

  async transferTo(target: SafeBankAccount, amount: number): Promise<Message> {
    console.log(Messages.transfer.attempt(amount, this.name, target.name));

    if (amount <= 0) {
      return Messages.transfer.failure("Amount must be greater than 0");
    }

    const [first, second] = [this, target].sort((a, b) =>
      a.name.localeCompare(b.name),
    ) as [SafeBankAccount, SafeBankAccount];

    return await first.mutex.withLock(async () => {
      return await second.mutex.withLock(async () => {
        if (this.balance < amount) {
          return Messages.transfer.failure("Insufficient funds");
        }

        this.balance -= amount;
        target.balance += amount;

        return Messages.transfer.success(amount, this.name, target.name);
      });
    });
  }

  getBalance(): number {
    return this.balance;
  }
}
