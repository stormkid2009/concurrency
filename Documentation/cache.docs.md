# ThreadSafeCache - Read-Write Lock Enabled Cache

The `ThreadSafeCache` class demonstrates practical usage of a read-write lock to implement a thread-safe cache that allows concurrent reads while ensuring exclusive writes. This is an excellent example of when read-write locks provide significant performance benefits over simple mutexes.

## Class: `ThreadSafeCache<K, V>`

### Overview

This generic cache implementation uses a `ReadWriteLock` to optimize for read-heavy workloads typical in caching scenarios. Multiple threads can read from the cache simultaneously, while write operations (set, delete) have exclusive access to maintain data consistency.

### Properties

- **`cache: Map<K, V>`** (private): The underlying Map that stores cached key-value pairs
- **`rwLock: ReadWriteLock`** (private): Read-write lock for coordinating access to the cache

### Type Parameters

- **`K`**: The type of keys stored in the cache
- **`V`**: The type of values stored in the cache

### Constructor

Creates a new thread-safe cache with empty initial state.

**Example:**
```typescript
// String keys, number values
const numCache = new ThreadSafeCache<string, number>();

// String keys, object values
const userCache = new ThreadSafeCache<string, User>();

// Number keys, string values
const messageCache = new ThreadSafeCache<number, string>();
```

### Methods

#### `async get(key: K): Promise<V | undefined>`

Retrieves a value from the cache by key. This is a read operation that can execute concurrently with other reads.

**Parameters:**
- `key: K` - The key to look up in the cache

**Returns:** `Promise<V | undefined>` - The cached value, or undefined if not found

**Thread Safety:**
- Uses read lock, allowing multiple concurrent get operations
- Blocked only when a write operation (set/delete) is in progress

**Example:**
```typescript
const cache = new ThreadSafeCache<string, User>();

// Multiple concurrent reads are allowed
const user1Promise = cache.get("user1");
const user2Promise = cache.get("user2");
const user3Promise = cache.get("user3");

// All three can execute simultaneously
const [user1, user2, user3] = await Promise.all([
  user1Promise,
  user2Promise, 
  user3Promise
]);
```

#### `async set(key: K, value: V): Promise<void>`

Stores a key-value pair in the cache. This is a write operation that requires exclusive access.

**Parameters:**
- `key: K` - The key to store
- `value: V` - The value to associate with the key

**Returns:** `Promise<void>`

**Thread Safety:**
- Uses write lock, ensuring exclusive access during the operation
- Blocks all other read and write operations until complete

**Example:**
```typescript
const cache = new ThreadSafeCache<string, User>();

// Set operations are exclusive
await cache.set("user1", { id: 1, name: "Alice" });
await cache.set("user2", { id: 2, name: "Bob" });
```

#### `async delete(key: K): Promise<boolean>`

Removes a key-value pair from the cache. This is a write operation that requires exclusive access.

**Parameters:**
- `key: K` - The key to remove from the cache

**Returns:** `Promise<boolean>` - true if the key existed and was removed, false if the key didn't exist

**Thread Safety:**
- Uses write lock, ensuring exclusive access during the operation
- Blocks all other read and write operations until complete

**Example:**
```typescript
const cache = new ThreadSafeCache<string, User>();

const wasDeleted = await cache.delete("user1");
if (wasDeleted) {
  console.log("User1 was removed from cache");
} else {
  console.log("User1 was not in cache");
}
```

#### `async has(key: K): Promise<boolean>`

Checks whether a key exists in the cache. This is a read operation that can execute concurrently with other reads.

**Parameters:**
- `key: K` - The key to check for existence

**Returns:** `Promise<boolean>` - true if the key exists, false otherwise

**Thread Safety:**
- Uses read lock, allowing multiple concurrent has operations
- Blocked only when a write operation (set/delete) is in progress

**Example:**
```typescript
const cache = new ThreadSafeCache<string, User>();

// Multiple concurrent existence checks
const checks = await Promise.all([
  cache.has("user1"),
  cache.has("user2"),
  cache.has("user3")
]);

console.log("Existence results:", checks); // [true, false, true]
```

## Usage Patterns

### Basic Cache Operations

```typescript
const cache = new ThreadSafeCache<string, User>();

// Populate cache
await cache.set("alice", { id: 1, name: "Alice", email: "alice@example.com" });
await cache.set("bob", { id: 2, name: "Bob", email: "bob@example.com" });

// Read from cache (can be concurrent)
const alice = await cache.get("alice");
const bob = await cache.get("bob");

// Check existence
if (await cache.has("charlie")) {
  console.log("Charlie is in cache");
}

// Remove from cache
const removed = await cache.delete("alice");
console.log(`Alice removed: ${removed}`);
```

### High-Concurrency Scenarios

```typescript
const cache = new ThreadSafeCache<string, ExpensiveData>();

// Simulate high read concurrency (typical cache usage)
async function simulateHighReadLoad() {
  // Pre-populate cache
  for (let i = 0; i < 100; i++) {
    await cache.set(`key${i}`, { data: `expensive computation ${i}` });
  }

  // Simulate many concurrent readers
  const readers = [];
  for (let i = 0; i < 1000; i++) {
    readers.push(
      cache.get(`key${Math.floor(Math.random() * 100)}`)
    );
  }

  // All reads can execute concurrently
  const startTime = Date.now();
  const results = await Promise.all(readers);
  const endTime = Date.now();

  console.log(`Completed ${results.length} reads in ${endTime - startTime}ms`);
}
```

### Cache with Expiration

```typescript
interface CacheEntry<V> {
  value: V;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ExpiringCache<K, V> extends ThreadSafeCache<K, CacheEntry<V>> {
  async setWithTTL(key: K, value: V, ttlMs: number): Promise<void> {
    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      ttl: ttlMs
    };
    await this.set(key, entry);
  }

  async getValid(key: K): Promise<V | undefined> {
    const entry = await this.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Entry expired, remove it
      await this.delete(key);
      return undefined;
    }

    return entry.value;
  }
}

// Usage
const expiringCache = new ExpiringCache<string, User>();
await expiringCache.setWithTTL("user1", user, 5000); // 5 second TTL

// Later...
const user = await expiringCache.getValid("user1"); // May return undefined if expired
```

### Write-Through Cache Pattern

```typescript
class WriteThoughCache<K, V> extends ThreadSafeCache<K, V> {
  constructor(private dataStore: DataStore<K, V>) {
    super();
  }

  async get(key: K): Promise<V | undefined> {
    // First check cache (uses read lock)
    let value = await super.get(key);
    
    if (value === undefined) {
      // Cache miss - load from data store
      value = await this.dataStore.load(key);
      if (value !== undefined) {
        // Store in cache for future reads
        await this.set(key, value);
      }
    }
    
    return value;
  }

  async set(key: K, value: V): Promise<void> {
    // Write to both cache and data store
    await Promise.all([
      super.set(key, value),           // Cache (uses write lock)
      this.dataStore.save(key, value)  // Persistent storage
    ]);
  }

  async delete(key: K): Promise<boolean> {
    // Delete from both cache and data store
    const [cacheResult] = await Promise.all([
      super.delete(key),              // Cache (uses write lock)
      this.dataStore.delete(key)      // Persistent storage
    ]);
    return cacheResult;
  }
}
```

## Performance Analysis

### Read-Heavy Workloads (Typical Cache Usage)

```typescript
// Benchmark: Read-heavy workload with ThreadSafeCache vs Mutex-based cache

async function benchmarkCache() {
  const cache = new ThreadSafeCache<string, string>();
  
  // Pre-populate
  for (let i = 0; i < 1000; i++) {
    await cache.set(`key${i}`, `value${i}`);
  }

  // Simulate 10,000 concurrent reads with occasional writes
  const operations = [];
  
  for (let i = 0; i < 10000; i++) {
    if (Math.random() < 0.95) { // 95% reads
      operations.push(
        cache.get(`key${Math.floor(Math.random() * 1000)}`)
      );
    } else { // 5% writes
      operations.push(
        cache.set(`key${Math.floor(Math.random() * 1000)}`, `newValue${i}`)
      );
    }
  }

  const startTime = Date.now();
  await Promise.all(operations);
  const endTime = Date.now();

  console.log(`Read-heavy workload completed in ${endTime - startTime}ms`);
}
```

### Performance Characteristics

| Operation | Concurrency | Lock Type | Performance |
|-----------|-------------|-----------|-------------|
| **get()** | High (multiple readers) | Read lock | Excellent |
| **has()** | High (multiple readers) | Read lock | Excellent |
| **set()** | Exclusive | Write lock | Good |
| **delete()** | Exclusive | Write lock | Good |

### Memory Efficiency

- **Cache Storage**: Uses JavaScript Map, which is memory efficient
- **Lock Overhead**: Read-write lock has higher memory overhead than mutex but much lower than per-key locks
- **Concurrent Operations**: No memory duplication for concurrent reads

## Thread Safety Guarantees

1. **Read Consistency**: Multiple readers see consistent cache state
2. **Write Atomicity**: Set and delete operations are atomic
3. **No Race Conditions**: Read-write lock prevents data races
4. **Exception Safety**: Locks are properly released even if operations throw

## When to Use ThreadSafeCache

### ✅ Ideal Use Cases

- **High read-to-write ratios** (typical caching scenarios)
- **Expensive data computations** that benefit from caching
- **Multi-threaded applications** with concurrent cache access
- **Session storage**, user data caching, configuration caching
- **API response caching**, database query result caching

### ✅ Performance Benefits

- **Concurrent Reads**: Multiple get/has operations execute simultaneously
- **Reduced Lock Contention**: Readers don't block each other
- **Better Throughput**: Higher overall operation throughput in read-heavy scenarios

### ❌ Not Ideal For

- **Write-heavy workloads** (more sets/deletes than gets)
- **Very simple caches** with minimal contention
- **Single-threaded applications** (no concurrency benefit)
- **Memory-constrained environments** (read-write lock has overhead)

## Best Practices

### ✅ Optimize for Read Operations

```typescript
// Good - separate frequent reads from writes
async function getUser(id: string): Promise<User> {
  let user = await cache.get(id);
  if (!user) {
    user = await loadUserFromDatabase(id);
    await cache.set(id, user); // Infrequent write
  }
  return user;
}
```

### ✅ Batch Operations When Possible

```typescript
// Good - batch related operations
async function getUsersById(ids: string[]): Promise<User[]> {
  // Concurrent reads
  const users = await Promise.all(ids.map(id => cache.get(id)));
  
  // Handle cache misses
  const missingIds = ids.filter((id, i) => !users[i]);
  if (missingIds.length > 0) {
    const loadedUsers = await loadUsersFromDatabase(missingIds);
    // Batch cache updates
    await Promise.all(
      loadedUsers.map(user => cache.set(user.id, user))
    );
  }
  
  return users.filter(user => user !== undefined);
}
```

### ✅ Consider Cache Size Management

```typescript
class BoundedCache<K, V> extends ThreadSafeCache<K, V> {
  private maxSize: number;
  private accessOrder = new Map<K, number>();

  constructor(maxSize: number = 1000) {
    super();
    this.maxSize = maxSize;
  }

  async set(key: K, value: V): Promise<void> {
    // This would need careful implementation with proper locking
    // to manage size limits and LRU eviction
    await super.set(key, value);
    
    // Track access for LRU
    this.accessOrder.set(key, Date.now());
  }
}
```

## Real-World Applications

- **Web Application Caches**: User sessions, page fragments, computed results
- **API Response Caches**: External API call results, database query results
- **Configuration Caches**: Application settings, feature flags, user preferences
- **Content Delivery**: Static assets, rendered templates, processed data
- **Microservice Caches**: Service-to-service call results, authentication tokens
