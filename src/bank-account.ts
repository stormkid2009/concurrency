import Mutex from "./mutex.js";

export default class SafeBankAccount {
  private balance: number;
  private mutex = new Mutex();

  constructor(
    private readonly name: string,
    initialBalance: number,
  ) {
    this.balance = initialBalance;
  }

  async deposit(amount: number): Promise<void> {
    await this.mutex.withLock(async () => {
      console.log(`[${this.name}] Depositing $${amount}...`);
      await this.simulateDelay();
      this.balance += amount;
      console.log(`[${this.name}] New Balance: $${this.balance}`);
    });
  }

  async withdraw(amount: number): Promise<boolean> {
    return await this.mutex.withLock(async () => {
      console.log(`[${this.name}] Attempting to withdraw $${amount}...`);
      await this.simulateDelay();
      if (this.balance >= amount) {
        this.balance -= amount;
        console.log(
          `[${this.name}] Withdrawal successful. New Balance: $${this.balance}`,
        );
        return true;
      } else {
        console.log(
          `[${this.name}] Withdrawal failed. Insufficient funds. Current Balance: $${this.balance}`,
        );
        return false;
      }
    });
  }

  async transferTo(target: SafeBankAccount, amount: number): Promise<void> {
    console.log(
      `[${this.name}] Transferring $${amount} to [${target.name}]...`,
    );

    // Lock both accounts in consistent order to avoid deadlock
    const [first, second] = [this, target].sort((a, b) =>
      a.name.localeCompare(b.name),
    ) as [SafeBankAccount, SafeBankAccount];

    await first.mutex.withLock(async () => {
      await second.mutex.withLock(async () => {
        const success = await this.withdraw(amount);
        if (success) {
          try {
            await target.deposit(amount);

            console.log(
              `[${this.name}] Transfer to [${target.name}] completed.`,
            );
          } catch (error) {
            await this.deposit(amount); // rollback this way money is safe
            console.error(error);
          }
        } else {
          console.log(`[${this.name}] Transfer failed. Not enough funds.`);
        }
      });
    });
  }

  async getBalance(): Promise<number> {
    return await this.mutex.withLock(async () => this.balance);
  }

  private async simulateDelay() {
    return new Promise<void>((res) => setTimeout(res, Math.random() * 1000));
  }
}
