# Concurrency Library - Main Export Module

This file serves as the main entry point for the concurrency library, exporting all the key components and types.

## Overview

The concurrency library provides thread-safe concurrency primitives and utilities for JavaScript/TypeScript applications. It includes implementations of mutexes, semaphores, read-write locks, and practical examples like thread-safe bank accounts, database connection pools, and rate-limited API clients.

## Exports

### Core Concurrency Primitives

- **Mutex**: Core concurrency primitive for mutual exclusion that ensures only one async operation can access a shared resource at a time.
- **Semaphore**: Counting semaphore for limiting concurrent access to resources, allowing a specified number of operations to proceed concurrently.

### Practical Implementations

- **SafeBankAccount**: Thread-safe bank account implementation demonstrating practical mutex usage with atomic operations for deposits, withdrawals, and transfers.
- **DatabaseConnectionPool**: Database connection pool with semaphore-based concurrency control that manages a pool of connections and limits concurrent database operations.

### Types and Interfaces

- **Action**: Type representing bank account actions ("deposit", "withdraw", "transfer")
- **MessageType**: Type representing message status types ("success", "failure", "attempt")
- **Message**: Interface for standardized messages in the system
- **GitHubUser**: Interface for GitHub user data
- **GitHubRepo**: Interface for GitHub repository data
- **OpenAIResponse**: Interface for OpenAI API responses

### Pre-defined Values

- **Messages**: Pre-defined message templates for banking operations that provides consistent messaging for deposit, withdrawal, and transfer operations.

## Usage Examples

### Basic Mutex Usage

```typescript
import { Mutex } from './concurrency';
const mutex = new Mutex();

await mutex.withLock(async () => {
  // Critical section - only one operation at a time
  console.log('Protected operation');
});
```

### Semaphore Usage for Rate Limiting

```typescript
import { Semaphore } from './concurrency';
const sem = new Semaphore(3); // Allow 3 concurrent operations

await sem.withPermit(async () => {
  // Your async operation here
});
```

### Bank Account Usage

```typescript
import { SafeBankAccount } from './concurrency';
const account = new SafeBankAccount('Alice');

await account.deposit(100);
await account.withdraw(50);
console.log(account.getBalance()); // 50
```

## API Implementations Note

The API client implementations (`GitHubAPIClient`, `OpenAIClient`, `SmartHTTPClient`)
are not exported by default as they are demonstration classes that users might
want to extend or instantiate with custom configurations.

To use them, import directly:

```typescript
import { GitHubAPIClient, OpenAIClient, SmartHTTPClient } from './api-implementation.js'
```
