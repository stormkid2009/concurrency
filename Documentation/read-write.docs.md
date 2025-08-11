# ReadWriteLock - Reader-Writer Lock Implementation

A Read-Write Lock (also known as a shared-exclusive lock) allows multiple readers to access a resource concurrently, but ensures exclusive access for writers. This is ideal for scenarios where reads are frequent and writes are less common.

## Class: `ReadWriteLock`

### Overview

The `ReadWriteLock` class implements a reader-writer synchronization primitive that maximizes concurrency by allowing multiple concurrent readers while ensuring exclusive access for writers. It's particularly useful for data structures that are read frequently but written to occasionally.

### Properties

- **`readers: number`** (private): Current number of active readers
- **`writer: boolean`** (private): Whether a writer is currently active
- **`readWaitQueue: Array<() => void>`** (private): Queue of readers waiting for access
- **`writeWaitQueue: Array<() => void>`** (private): Queue of writers waiting for access

### Methods

#### `async acquireRead(): Promise<void>`

Acquires a read lock. Multiple readers can hold the lock simultaneously, but readers must wait if a writer is active or waiting.

**Returns:** `Promise<void>` - Resolves when the read lock is successfully acquired

**Behavior:**
- If no writer is active and no writers are waiting, immediately grants read access and increments reader count
- If a writer is active or writers are waiting, adds the reader to the wait queue
- Writers have priority over readers to prevent writer starvation

**Example:**
```typescript
const rwLock = new ReadWriteLock();
await rwLock.acquireRead();
// ... perform read operations (can be concurrent with other readers)
rwLock.releaseRead();
```

#### `releaseRead(): void`

Releases a read lock. If this was the last reader and writers are waiting, grants access to the next writer.

**Returns:** `void`

**Behavior:**
- Decrements the reader count
- If no readers remain and writers are waiting, grants write access to the next writer

**Example:**
```typescript
rwLock.releaseRead(); // Always call after finishing read operations
```

#### `async acquireWrite(): Promise<void>`

Acquires a write lock. Writers have exclusive access - no readers or other writers can be active.

**Returns:** `Promise<void>` - Resolves when the write lock is successfully acquired

**Behavior:**
- If no writer is active and no readers are active, immediately grants write access
- If writers or readers are active, adds the writer to the wait queue
- Once granted, blocks all new readers and writers until released

**Example:**
```typescript
await rwLock.acquireWrite();
// ... perform write operations (exclusive access)
rwLock.releaseWrite();
```

#### `releaseWrite(): void`

Releases a write lock. Prioritizes waiting writers first, then releases all waiting readers if no writers are waiting.

**Returns:** `void`

**Behavior:**
- Sets writer flag to false
- If writers are waiting, grants access to the next writer (writer priority)
- If no writers are waiting, releases all waiting readers simultaneously

**Example:**
```typescript
rwLock.releaseWrite(); // Always call after finishing write operations
```

#### `async withReadLock<T>(fn: () => Promise<T>): Promise<T>`

Convenience method that automatically handles read lock acquisition and release around a provided function.

**Parameters:**
- `fn: () => Promise<T>` - The async function to execute with read access

**Returns:** `Promise<T>` - The result of the provided function

**Features:**
- Automatically acquires read lock before executing the function
- Automatically releases read lock after execution (even if an exception occurs)
- Preserves the return value and exceptions from the provided function
- Uses try/finally to ensure lock is always released

**Example:**
```typescript
const data = await rwLock.withReadLock(async () => {
  // Read operations - can be concurrent with other readers
  return await readDataFromResource();
});
// Read lock is automatically released here
```

#### `async withWriteLock<T>(fn: () => Promise<T>): Promise<T>`

Convenience method that automatically handles write lock acquisition and release around a provided function.

**Parameters:**
- `fn: () => Promise<T>` - The async function to execute with exclusive write access

**Returns:** `Promise<T>` - The result of the provided function

**Features:**
- Automatically acquires write lock before executing the function  
- Automatically releases write lock after execution (even if an exception occurs)
- Preserves the return value and exceptions from the provided function
- Uses try/finally to ensure lock is always released

**Example:**
```typescript
await rwLock.withWriteLock(async () => {
  // Write operations - exclusive access
  await updateResource(newData);
});
// Write lock is automatically released here
```

## Usage Patterns

### Basic Read-Write Operations

```typescript
const rwLock = new ReadWriteLock();
let sharedData = { value: 0, lastModified: Date.now() };

// Multiple concurrent readers
async function readData() {
  return await rwLock.withReadLock(async () => {
    // Multiple readers can execute this simultaneously
    console.log(`Reading value: ${sharedData.value}`);
    await someAsyncProcessing(); // Simulate async read work
    return sharedData.value;
  });
}

// Exclusive writer
async function writeData(newValue: number) {
  await rwLock.withWriteLock(async () => {
    // Only one writer can execute this at a time
    // No readers can access during write
    console.log(`Updating value from ${sharedData.value} to ${newValue}`);
    sharedData.value = newValue;
    sharedData.lastModified = Date.now();
    await someAsyncSaveOperation(); // Simulate async write work
  });
}
```

### Database-Style Operations

```typescript
const rwLock = new ReadWriteLock();
const database = new Map<string, any>();

// Read operations (can be concurrent)
async function getUser(id: string) {
  return await rwLock.withReadLock(async () => {
    const user = database.get(id);
    await simulateNetworkDelay(50); // Simulate DB read latency
    return user;
  });
}

async function getAllUsers() {
  return await rwLock.withReadLock(async () => {
    const users = Array.from(database.values());
    await simulateNetworkDelay(100); // Simulate DB scan latency
    return users;
  });
}

// Write operations (exclusive)
async function createUser(user: { id: string, name: string }) {
  await rwLock.withWriteLock(async () => {
    database.set(user.id, user);
    await simulateNetworkDelay(200); // Simulate DB write latency
    console.log(`Created user: ${user.name}`);
  });
}

async function deleteUser(id: string) {
  await rwLock.withWriteLock(async () => {
    const deleted = database.delete(id);
    await simulateNetworkDelay(150); // Simulate DB delete latency
    console.log(`Deleted user ${id}: ${deleted}`);
  });
}
```

### Cache with Read-Write Lock

```typescript
class ThreadSafeCache<K, V> {
  private cache = new Map<K, V>();
  private rwLock = new ReadWriteLock();

  async get(key: K): Promise<V | undefined> {
    return this.rwLock.withReadLock(async () => {
      return this.cache.get(key);
    });
  }

  async set(key: K, value: V): Promise<void> {
    await this.rwLock.withWriteLock(async () => {
      this.cache.set(key, value);
    });
  }

  async delete(key: K): Promise<boolean> {
    return this.rwLock.withWriteLock(async () => {
      return this.cache.delete(key);
    });
  }

  async has(key: K): Promise<boolean> {
    return this.rwLock.withReadLock(async () => {
      return this.cache.has(key);
    });
  }
}
```

## Advanced Usage Patterns

### Manual Lock Management

```typescript
const rwLock = new ReadWriteLock();

async function complexReadOperation() {
  await rwLock.acquireRead();
  try {
    // Phase 1: Read some data
    const data1 = await readPhase1();
    
    // Phase 2: Process data (still under read lock)
    const processed = await processData(data1);
    
    // Phase 3: Read more related data
    const data2 = await readPhase2(processed);
    
    return combineData(processed, data2);
  } finally {
    rwLock.releaseRead();
  }
}

async function complexWriteOperation() {
  await rwLock.acquireWrite();
  try {
    // Phase 1: Read current state
    const currentState = await readCurrentState();
    
    // Phase 2: Compute changes
    const changes = await computeChanges(currentState);
    
    // Phase 3: Apply changes atomically
    await applyChanges(changes);
    
    // Phase 4: Update indexes
    await updateIndexes(changes);
    
  } finally {
    rwLock.releaseWrite();
  }
}
```

### Reader-Writer Priority Control

The current implementation gives priority to writers to prevent writer starvation:

```typescript
// Writers are prioritized over new readers
async function prioritizeWriters() {
  const rwLock = new ReadWriteLock();
  
  // Start some readers
  const readers = Array.from({ length: 5 }, (_, i) =>
    rwLock.withReadLock(async () => {
      console.log(`Reader ${i} active`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    })
  );
  
  // Start a writer (will wait for current readers but block new readers)
  setTimeout(() => {
    rwLock.withWriteLock(async () => {
      console.log('Writer active - exclusive access');
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
  }, 500);
  
  // These readers will wait until after the writer completes
  setTimeout(() => {
    const newReaders = Array.from({ length: 3 }, (_, i) =>
      rwLock.withReadLock(async () => {
        console.log(`New reader ${i} active`);
      })
    );
  }, 1000);
}
```

## Thread Safety Guarantees

1. **Reader Concurrency**: Multiple readers can access the resource simultaneously
2. **Writer Exclusivity**: Writers have exclusive access (no concurrent readers or writers)
3. **Writer Priority**: Waiting writers prevent new readers from acquiring locks
4. **Starvation Prevention**: Writers are prioritized to prevent indefinite delays
5. **Exception Safety**: Using `withReadLock()` and `withWriteLock()` ensures locks are released

## Performance Characteristics

- **Read Lock Acquisition**: O(1) when no writers, queued when writers are waiting
- **Write Lock Acquisition**: O(1) when no readers/writers, queued otherwise
- **Lock Release**: O(1) for reads, O(n) for writes when releasing multiple waiting readers
- **Memory**: O(n) where n is the number of waiting operations
- **Concurrency**: Maximizes read concurrency while ensuring write safety

## When to Use Read-Write Locks

### ✅ Good Use Cases

- **Read-Heavy Workloads**: Data is read much more frequently than written
- **Large Data Structures**: Reading takes significant time, concurrent reads improve performance
- **Configuration/Settings**: Frequently accessed but rarely updated data
- **Caches**: High read-to-write ratios
- **Statistical Data**: Metrics that are collected frequently but computed periodically

### ❌ Poor Use Cases

- **Write-Heavy Workloads**: More writes than reads make the complexity unnecessary
- **Short Operations**: Overhead of lock management exceeds operation time
- **Simple Data**: Basic operations where a mutex would be simpler
- **Equal Read/Write Ratios**: No significant performance benefit over mutex

## Comparison with Mutex

| Feature | Mutex | Read-Write Lock |
|---------|-------|-----------------|
| **Read Concurrency** | No (exclusive) | Yes (multiple readers) |
| **Write Concurrency** | No (exclusive) | No (exclusive) |
| **Complexity** | Simple | More complex |
| **Performance (read-heavy)** | Lower | Higher |
| **Performance (write-heavy)** | Higher | Lower |
| **Memory Overhead** | Lower | Higher |
| **Use Case** | General mutual exclusion | Read-heavy scenarios |

## Best Practices

### ✅ Use withReadLock() and withWriteLock()

```typescript
// Recommended - automatic cleanup
await rwLock.withReadLock(async () => {
  // Read operations
});
```

### ✅ Keep Critical Sections Small

```typescript
// Good - minimal lock time
await rwLock.withWriteLock(async () => {
  data.value = newValue; // Quick update
});

// Bad - long lock time
await rwLock.withWriteLock(async () => {
  const result = await expensiveComputation(); // Long operation
  data.value = result;
});
```

### ✅ Separate Read and Write Operations

```typescript
// Good - clear separation
async function readData() {
  return await rwLock.withReadLock(() => getData());
}

async function writeData(value) {
  await rwLock.withWriteLock(() => setData(value));
}
```

### ❌ Don't Upgrade Locks

```typescript
// This will cause deadlock!
await rwLock.withReadLock(async () => {
  const data = readData();
  if (needsUpdate(data)) {
    // DON'T DO THIS - will deadlock
    await rwLock.withWriteLock(() => updateData());
  }
});
```

## Real-World Applications

- **Web Caches**: Multiple requests reading cached data, periodic cache updates
- **Configuration Management**: Frequent config reads, rare config updates  
- **Database Systems**: Query processing (reads) vs. schema changes (writes)
- **Analytics**: Frequent metric collection, periodic report generation
- **Content Management**: Multiple users viewing content, occasional content updates
