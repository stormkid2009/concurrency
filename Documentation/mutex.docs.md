# Mutex - Mutual Exclusion Lock Implementation

A Mutex (Mutual Exclusion) is a concurrency primitive that ensures only one asynchronous operation can access a shared resource at a time. This implementation provides thread-safe access to critical sections in JavaScript/TypeScript applications.

## Class: `Mutex`

### Overview

The `Mutex` class implements a simple but effective mutual exclusion mechanism using JavaScript's native Promise system. It manages a queue of waiting operations and ensures atomic access to shared resources.

### Properties

- **`locked: boolean`** (private): Indicates whether the mutex is currently locked
- **`waitQueue: Array<() => void>`** (private): Queue of resolve functions waiting for the lock to be released

### Methods

#### `async lock(): Promise<void>`

Acquires the mutex lock. If the mutex is already locked, the calling operation will wait in a queue until the lock becomes available.

**Returns:** `Promise<void>` - Resolves when the lock is successfully acquired

**Behavior:**
- If the mutex is free, immediately sets `locked = true` and returns
- If the mutex is locked, adds the operation to the wait queue as a Promise

**Example:**
```typescript
const mutex = new Mutex();
await mutex.lock();
// Critical section - only one operation can be here at a time
// ... perform protected operations
mutex.unlock();
```

#### `unlock(): void`

Releases the mutex lock. If there are operations waiting in the queue, immediately passes the lock to the next waiting operation.

**Returns:** `void`

**Behavior:**
- If there are operations in the wait queue, removes the first one and grants it the lock
- If no operations are waiting, sets `locked = false`

**Example:**
```typescript
mutex.unlock(); // Always call after finishing with protected resource
```

#### `async withLock<T>(fn: () => Promise<T>): Promise<T>`

Convenience method that automatically handles lock acquisition and release around a provided function. This is the recommended way to use the mutex as it ensures proper cleanup even if exceptions occur.

**Parameters:**
- `fn: () => Promise<T>` - The async function to execute within the critical section

**Returns:** `Promise<T>` - The result of the provided function

**Features:**
- Automatically acquires the lock before executing the function
- Automatically releases the lock after execution (even if an exception occurs)
- Preserves the return value and exceptions from the provided function
- Uses try/finally to ensure lock is always released

**Example:**
```typescript
const result = await mutex.withLock(async () => {
  // Critical section
  const data = await someAsyncOperation();
  return processData(data);
});
// Lock is automatically released here
```

## Usage Patterns

### Basic Protection Pattern

```typescript
const mutex = new Mutex();
let sharedResource = 0;

// Multiple async operations competing for the same resource
async function incrementSafely() {
  await mutex.lock();
  try {
    // Critical section - atomic increment
    const current = sharedResource;
    await someAsyncDelay(); // Simulate async work
    sharedResource = current + 1;
  } finally {
    mutex.unlock();
  }
}
```

### Recommended Pattern (Using withLock)

```typescript
const mutex = new Mutex();
let sharedResource = 0;

async function incrementSafely() {
  return await mutex.withLock(async () => {
    // Critical section - atomic increment
    const current = sharedResource;
    await someAsyncDelay(); // Simulate async work
    sharedResource = current + 1;
    return sharedResource; // Return the new value
  });
}
```

### Multiple Resource Protection

```typescript
const userMutex = new Mutex();
const users = new Map();

async function updateUser(userId: string, updates: any) {
  await userMutex.withLock(async () => {
    const user = users.get(userId) || {};
    const updatedUser = { ...user, ...updates };
    users.set(userId, updatedUser);
    
    // Simulate database save
    await saveUserToDatabase(updatedUser);
  });
}
```

## Thread Safety Guarantees

1. **Mutual Exclusion**: Only one operation can hold the lock at any time
2. **FIFO Ordering**: Operations acquire the lock in the order they requested it
3. **Deadlock Prevention**: Simple single-lock design prevents deadlocks
4. **Exception Safety**: Using `withLock()` ensures locks are released even if exceptions occur

## Performance Characteristics

- **Lock Acquisition**: O(1) when free, queued when locked
- **Lock Release**: O(1) operation
- **Memory**: O(n) where n is the number of waiting operations
- **No Polling**: Uses Promise-based waiting (no busy waiting)

## Common Pitfalls and Best Practices

### ❌ Don't Do This (Manual lock/unlock)
```typescript
await mutex.lock();
await riskyOperation(); // If this throws, lock is never released!
mutex.unlock();
```

### ✅ Do This Instead (Using withLock)
```typescript
await mutex.withLock(async () => {
  await riskyOperation(); // Lock automatically released even if this throws
});
```

### ❌ Avoid Nested Locks
```typescript
// This can cause deadlocks if not careful
await mutex1.withLock(async () => {
  await mutex2.withLock(async () => {
    // Nested critical sections
  });
});
```

### ✅ Better Approach for Multiple Resources
```typescript
// Always acquire locks in consistent order to prevent deadlocks
const locks = [mutex1, mutex2].sort((a, b) => a.id - b.id);
for (const lock of locks) {
  await lock.lock();
}
try {
  // Use both resources
} finally {
  locks.reverse().forEach(lock => lock.unlock());
}
```

## Real-world Applications

- **Database Transactions**: Ensuring atomic updates to shared data
- **File Operations**: Preventing concurrent writes to the same file
- **Cache Management**: Coordinating cache updates and invalidations
- **Resource Allocation**: Managing access to limited resources like connections
- **State Management**: Protecting shared application state from race conditions
