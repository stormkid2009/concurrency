# SafeBankAccount - Thread-Safe Banking Operations

The `SafeBankAccount` class demonstrates practical usage of mutex locks in a real-world scenario. It provides atomic banking operations (deposits, withdrawals, transfers) that are safe for concurrent access using the `Mutex` primitive.

## Class: `SafeBankAccount`

### Overview

This class implements a thread-safe bank account with proper concurrency control. All operations are atomic and prevent race conditions that could occur with concurrent access to the account balance.

### Properties

- **`balance: number`** (private): The current account balance
- **`mutex: Mutex`** (private, readonly): Mutex for protecting balance operations
- **`name: string`** (public, readonly): The account holder's name

### Constructor

#### `constructor(name: string)`

Creates a new bank account with zero balance.

**Parameters:**
- `name: string` - The name of the account holder

**Example:**
```typescript
const account = new SafeBankAccount("Alice");
```

### Methods

#### `async deposit(amount: number): Promise<Message>`

Deposits money into the account. This operation is atomic and thread-safe.

**Parameters:**
- `amount: number` - The amount to deposit (must be > 0)

**Returns:** `Promise<Message>` - A message indicating success or failure

**Behavior:**
- Validates that the amount is greater than 0
- Logs an attempt message
- Atomically adds the amount to the balance using mutex protection
- Returns a success or failure message

**Thread Safety:**
- Uses `mutex.withLock()` to ensure atomic balance updates
- Multiple concurrent deposits will be serialized

**Example:**
```typescript
const result = await account.deposit(100);
console.log(result.text); // "Successfully deposited 100 to Alice's account."
```

#### `async withdraw(amount: number): Promise<Message>`

Withdraws money from the account. This operation is atomic and thread-safe.

**Parameters:**
- `amount: number` - The amount to withdraw (must be > 0)

**Returns:** `Promise<Message>` - A message indicating success or failure

**Behavior:**
- Validates that the amount is greater than 0
- Logs an attempt message
- Atomically checks balance and withdraws if sufficient funds exist
- Returns a success or failure message

**Thread Safety:**
- Uses `mutex.withLock()` to ensure atomic balance checks and updates
- Prevents race conditions between balance check and withdrawal

**Example:**
```typescript
const result = await account.withdraw(50);
if (result.type === "success") {
  console.log("Withdrawal successful");
} else {
  console.log("Withdrawal failed:", result.text);
}
```

#### `async transferTo(target: SafeBankAccount, amount: number): Promise<Message>`

Transfers money from this account to another account. This operation is atomic across both accounts.

**Parameters:**
- `target: SafeBankAccount` - The target account to transfer to
- `amount: number` - The amount to transfer (must be > 0)

**Returns:** `Promise<Message>` - A message indicating success or failure

**Behavior:**
- Validates that the amount is greater than 0
- Logs an attempt message
- Acquires locks on both accounts in a consistent order (by name) to prevent deadlocks
- Atomically checks source balance and performs the transfer
- Returns a success or failure message

**Thread Safety:**
- Uses ordered locking to prevent deadlocks (always locks accounts in alphabetical order by name)
- Ensures atomic transfer across both accounts
- Multiple concurrent transfers involving the same accounts will be properly serialized

**Deadlock Prevention:**
The method sorts the accounts by name before acquiring locks, ensuring that all threads acquire locks in the same order, preventing circular wait conditions that could cause deadlocks.

**Example:**
```typescript
const alice = new SafeBankAccount("Alice");
const bob = new SafeBankAccount("Bob");

await alice.deposit(100);
const result = await alice.transferTo(bob, 50);
console.log(result.text); // "Transferred 50 from Alice to Bob successfully."
```

#### `getBalance(): number`

Returns the current account balance.

**Returns:** `number` - The current balance

**Note:** This operation is not protected by a mutex as it's a simple read operation. However, the value may not reflect pending operations that are currently executing.

**Example:**
```typescript
const balance = account.getBalance();
console.log(`Current balance: $${balance}`);
```

## Usage Patterns

### Basic Account Operations

```typescript
// Create accounts
const alice = new SafeBankAccount("Alice");
const bob = new SafeBankAccount("Bob");

// Deposit money
await alice.deposit(1000);
await bob.deposit(500);

// Withdraw money
const withdrawResult = await alice.withdraw(200);
if (withdrawResult.type === "success") {
  console.log(`Alice's new balance: $${alice.getBalance()}`);
}

// Transfer money
await alice.transferTo(bob, 100);
console.log(`Alice: $${alice.getBalance()}, Bob: $${bob.getBalance()}`);
```

### Concurrent Operations

```typescript
const account = new SafeBankAccount("Shared Account");
await account.deposit(1000);

// Multiple concurrent operations - all will be properly serialized
const operations = [
  account.deposit(100),
  account.withdraw(50),
  account.deposit(75),
  account.withdraw(25),
  account.deposit(200)
];

const results = await Promise.all(operations);
results.forEach(result => console.log(result.text));

console.log(`Final balance: $${account.getBalance()}`);
```

### Concurrent Transfers (Deadlock-Safe)

```typescript
const accounts = [
  new SafeBankAccount("Alice"),
  new SafeBankAccount("Bob"),
  new SafeBankAccount("Charlie")
];

// Initialize with some money
for (const account of accounts) {
  await account.deposit(1000);
}

// Multiple concurrent transfers between different accounts
// The ordered locking prevents deadlocks
const transfers = [
  accounts[0].transferTo(accounts[1], 100), // Alice -> Bob
  accounts[1].transferTo(accounts[2], 150), // Bob -> Charlie
  accounts[2].transferTo(accounts[0], 75),  // Charlie -> Alice
  accounts[0].transferTo(accounts[2], 50),  // Alice -> Charlie
];

const results = await Promise.all(transfers);
results.forEach(result => console.log(result.text));
```

## Message Integration

The class integrates with the messaging system defined in `types.ts`:

```typescript
// All operations return standardized messages
const depositResult = await account.deposit(100);
console.log(`Type: ${depositResult.type}`);     // "success" | "failure" | "attempt"
console.log(`Action: ${depositResult.action}`); // "deposit"
console.log(`Text: ${depositResult.text}`);     // Human-readable message

// Messages follow consistent patterns
const messages = [
  Messages.deposit.attempt(100, "Alice"),  // Attempt message
  Messages.deposit.success(100, "Alice"),  // Success message
  Messages.deposit.failure("Invalid amount") // Failure message
];
```

## Thread Safety Analysis

### Race Condition Prevention

1. **Balance Updates**: All balance modifications are protected by mutex locks
2. **Check-Then-Act**: Operations like withdrawal that check balance before modifying use atomic sections
3. **Cross-Account Operations**: Transfers lock both accounts to ensure consistency

### Deadlock Prevention

The `transferTo` method implements ordered locking:

```typescript
const [first, second] = [this, target].sort((a, b) => 
  a.name.localeCompare(b.name)
);

return await first.mutex.withLock(async () => {
  return await second.mutex.withLock(async () => {
    // Transfer logic here
  });
});
```

This ensures that regardless of the order in which transfers are initiated, locks are always acquired in the same order (alphabetically by account name), preventing circular wait conditions.

### Atomic Operations

All banking operations are atomic:
- **Deposits**: Single atomic increment
- **Withdrawals**: Atomic check-and-decrement
- **Transfers**: Atomic dual-account update

## Real-World Applications

This pattern is applicable to many scenarios:

- **Financial Systems**: Bank accounts, trading accounts, digital wallets
- **Inventory Management**: Stock levels, product reservations
- **Resource Allocation**: Credits, quotas, capacity management  
- **Game Development**: Player currencies, experience points
- **E-commerce**: Shopping cart totals, discount calculations

## Performance Considerations

- **Lock Contention**: High-frequency operations on the same account will serialize
- **Lock Duration**: Operations are designed to hold locks for minimal time
- **Read Operations**: `getBalance()` is lock-free but may show stale values
- **Deadlock Prevention**: Ordered locking adds slight overhead but prevents deadlocks

## Error Handling

The class provides comprehensive error handling:

- **Validation Errors**: Invalid amounts (≤ 0) return failure messages
- **Business Logic Errors**: Insufficient funds return descriptive failure messages
- **Exception Safety**: Mutex locks are properly released even if operations throw exceptions

## Best Practices Demonstrated

1. **Always Use withLock()**: Ensures proper lock cleanup
2. **Minimize Critical Sections**: Keep locked code sections as small as possible
3. **Ordered Locking**: Prevent deadlocks with consistent lock ordering
4. **Atomic Operations**: Combine related operations within single critical sections
5. **Clear Error Messages**: Provide meaningful feedback for all failure cases
