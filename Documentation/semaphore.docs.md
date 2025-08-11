# Semaphore - Counting Semaphore Implementation

A Semaphore is a concurrency primitive that controls access to a resource by maintaining a count of available permits. Unlike a mutex which allows only one operation at a time, a semaphore allows a specified number of operations to proceed concurrently.

## Class: `Semaphore`

### Overview

The `Semaphore` class implements a counting semaphore using JavaScript's Promise system. It's particularly useful for rate limiting, resource pool management, and controlling the level of concurrency in async operations.

### Properties

- **`permits: number`** (private): Current number of available permits
- **`waitQueue: Array<() => void>`** (private): Queue of resolve functions waiting for permits

### Constructor

#### `constructor(permits: number)`

Creates a new semaphore with the specified number of initial permits.

**Parameters:**
- `permits: number` - The initial number of permits (concurrent operations allowed)

**Example:**
```typescript
const semaphore = new Semaphore(3); // Allow 3 concurrent operations
```

### Methods

#### `async acquire(): Promise<void>`

Acquires a permit from the semaphore. If no permits are available, the operation waits in a queue until a permit becomes available.

**Returns:** `Promise<void>` - Resolves when a permit is successfully acquired

**Behavior:**
- If permits are available (`permits > 0`), decrements the count and returns immediately
- If no permits are available, adds the operation to the wait queue as a Promise

**Example:**
```typescript
await semaphore.acquire();
// ... perform rate-limited operation
semaphore.release();
```

#### `release(): void`

Releases a permit back to the semaphore. If there are operations waiting in the queue, immediately grants a permit to the next waiting operation.

**Returns:** `void`

**Behavior:**
- If there are operations in the wait queue, removes the first one and grants it a permit
- If no operations are waiting, increments the permit count

**Example:**
```typescript
semaphore.release(); // Always call after finishing with the protected resource
```

#### `async withPermit<T>(fn: () => Promise<T>): Promise<T>`

Convenience method that automatically handles permit acquisition and release around a provided function. This is the recommended way to use the semaphore as it ensures proper cleanup.

**Parameters:**
- `fn: () => Promise<T>` - The async function to execute with a permit

**Returns:** `Promise<T>` - The result of the provided function

**Features:**
- Automatically acquires a permit before executing the function
- Automatically releases the permit after execution (even if an exception occurs)
- Preserves the return value and exceptions from the provided function
- Uses try/finally to ensure permit is always released

**Example:**
```typescript
const result = await semaphore.withPermit(async () => {
  // Rate-limited operation
  const response = await fetch(apiUrl);
  return await response.json();
});
// Permit is automatically released here
```

## Usage Patterns

### Rate Limiting API Calls

```typescript
const apiSemaphore = new Semaphore(5); // Max 5 concurrent API calls

async function fetchUserData(userId: string) {
  return await apiSemaphore.withPermit(async () => {
    const response = await fetch(`/api/users/${userId}`);
    return await response.json();
  });
}

// Can make many concurrent calls, but only 5 will run at once
const users = await Promise.all([
  fetchUserData("1"),
  fetchUserData("2"),
  // ... up to 100 user IDs
  fetchUserData("100")
]);
```

### Database Connection Pool

```typescript
const dbSemaphore = new Semaphore(10); // Max 10 concurrent DB operations

async function executeQuery(sql: string) {
  return await dbSemaphore.withPermit(async () => {
    const connection = await getConnection();
    try {
      return await connection.query(sql);
    } finally {
      await connection.release();
    }
  });
}
```

### File Processing Limits

```typescript
const fileSemaphore = new Semaphore(3); // Process max 3 files concurrently

async function processFile(filePath: string) {
  return await fileSemaphore.withPermit(async () => {
    const content = await fs.readFile(filePath, 'utf8');
    const processed = await expensiveProcessing(content);
    await fs.writeFile(`${filePath}.processed`, processed);
    return processed;
  });
}

// Process many files with controlled concurrency
const results = await Promise.all(
  filePaths.map(path => processFile(path))
);
```

## Advanced Usage Patterns

### Manual Permit Management

```typescript
const semaphore = new Semaphore(2);

async function complexOperation() {
  await semaphore.acquire();
  try {
    // Phase 1: Do some work
    const data = await fetchData();
    
    // Phase 2: Process data (still holding permit)
    const result = await processData(data);
    
    return result;
  } finally {
    semaphore.release();
  }
}
```

### Dynamic Permit Adjustment

```typescript
class DynamicSemaphore extends Semaphore {
  constructor(initialPermits: number) {
    super(initialPermits);
  }
  
  // Add permits (increase concurrency)
  addPermits(count: number) {
    for (let i = 0; i < count; i++) {
      this.release();
    }
  }
  
  // Note: Removing permits is complex and not shown here
  // as it requires careful handling of active operations
}

const semaphore = new DynamicSemaphore(5);

// Scale up during high traffic
semaphore.addPermits(5); // Now allows 10 concurrent operations
```

### Timeout with Permits

```typescript
async function withTimeout<T>(
  semaphore: Semaphore,
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });
  
  return await Promise.race([
    semaphore.withPermit(fn),
    timeoutPromise
  ]);
}
```

## Thread Safety Guarantees

1. **Counting Control**: Maintains accurate count of available permits
2. **FIFO Ordering**: Operations acquire permits in the order they requested them
3. **Atomic Operations**: Permit acquisition and release are atomic
4. **Exception Safety**: Using `withPermit()` ensures permits are released even if exceptions occur

## Performance Characteristics

- **Permit Acquisition**: O(1) when permits available, queued when exhausted
- **Permit Release**: O(1) operation  
- **Memory**: O(n) where n is the number of waiting operations
- **No Polling**: Uses Promise-based waiting (no busy waiting)
- **Scalability**: Efficient even with high contention

## Common Use Cases

### 1. Rate Limiting
Control the rate of API calls, database queries, or other resource-intensive operations.

### 2. Resource Pool Management
Limit access to finite resources like database connections, file handles, or memory pools.

### 3. Throttling
Prevent system overload by limiting concurrent operations that consume CPU, memory, or network bandwidth.

### 4. Batch Processing
Process large datasets with controlled concurrency to balance speed and resource usage.

### 5. External Service Integration
Respect rate limits imposed by external APIs or services.

## Best Practices

### ✅ Use withPermit() for Automatic Cleanup
```typescript
await semaphore.withPermit(async () => {
  // Your operation here
}); // Permit automatically released
```

### ✅ Choose Appropriate Permit Counts
```typescript
// Consider your resource limits
const cpuIntensive = new Semaphore(os.cpus().length); // CPU-bound tasks
const apiCalls = new Semaphore(10); // Based on API rate limits
const dbQueries = new Semaphore(20); // Based on connection pool size
```

### ✅ Handle Errors Gracefully
```typescript
try {
  await semaphore.withPermit(async () => {
    throw new Error('Operation failed');
  });
} catch (error) {
  // Permit is still properly released
  console.error('Operation failed:', error);
}
```

### ❌ Avoid Manual Management Without Try/Finally
```typescript
// Risky - permit might not be released on error
await semaphore.acquire();
await riskyOperation(); // If this throws, permit is lost!
semaphore.release();
```

## Comparison with Mutex

| Feature | Mutex | Semaphore |
|---------|-------|-----------|
| **Concurrent Access** | 1 operation | N operations |
| **Use Case** | Mutual exclusion | Rate limiting |
| **Permits** | Binary (0 or 1) | Counting (0 to N) |
| **Deadlock Risk** | Higher (with multiple mutexes) | Lower |
| **Performance** | Slightly faster | Good for high concurrency |
