# DatabaseConnectionPool - Semaphore-Based Connection Pool

The `DatabaseConnectionPool` class demonstrates practical usage of semaphores to implement a database connection pool that limits the number of concurrent database operations. This is a common pattern in real-world applications for managing finite resources like database connections.

## Classes Overview

### `DatabaseConnection` (Mock Class)

A mock database connection that simulates real database connections with network latency and connection state tracking.

**Properties:**
- **`id: number`** (public, readonly): Unique identifier for the connection
- **`inUse: boolean`** (private): Whether the connection is currently executing a query

### `DatabaseConnectionPool`

The main connection pool that manages a fixed number of database connections and uses a semaphore to control concurrent access.

**Properties:**
- **`connections: DatabaseConnection[]`** (private): Array of all connections in the pool
- **`availableConnections: DatabaseConnection[]`** (private): Array of currently available connections
- **`semaphore: Semaphore`** (private): Semaphore controlling concurrent access to connections
- **`maxConnections: number`** (private): Maximum number of connections in the pool

## DatabaseConnection Class

### Constructor

Creates a new database connection with a unique ID.

```typescript
constructor()
```

**Behavior:**
- Assigns a unique ID using a static counter
- Initializes the connection as not in use

### Methods

#### `async query(sql: string): Promise<any[]>`

Simulates executing a database query with realistic behavior including latency and connection state management.

**Parameters:**
- `sql: string` - The SQL query to execute

**Returns:** `Promise<any[]>` - Mock query results

**Behavior:**
- Validates that the connection isn't already in use (prevents double-use)
- Marks the connection as in use during query execution
- Simulates network latency (500-1500ms random delay)
- Returns mock query results
- Marks the connection as available when complete

**Error Handling:**
- Throws an error if the connection is already in use

**Example:**
```typescript
const connection = new DatabaseConnection();
const results = await connection.query("SELECT * FROM users");
console.log(results); // [{ data: "Result from connection 1" }]
```

## DatabaseConnectionPool Class

### Constructor

#### `constructor(maxConnections: number = 3)`

Creates a new connection pool with the specified number of connections.

**Parameters:**
- `maxConnections: number` - Maximum number of connections in the pool (default: 3)

**Behavior:**
- Creates the specified number of `DatabaseConnection` instances
- Initializes all connections as available
- Creates a semaphore with permits equal to the max connections
- Logs the pool creation

**Example:**
```typescript
const pool = new DatabaseConnectionPool(5); // Create pool with 5 connections
```

### Methods

#### `async executeQuery(sql: string, clientId: string): Promise<any[]>`

Executes a database query using an available connection from the pool. This is the main method that demonstrates semaphore-controlled resource allocation.

**Parameters:**
- `sql: string` - The SQL query to execute
- `clientId: string` - Identifier for the client making the request (for logging)

**Returns:** `Promise<any[]>` - Query results

**Behavior:**
1. Uses semaphore to acquire a permit (blocks if all connections are busy)
2. Gets an available connection from the pool
3. Executes the query on the acquired connection
4. Returns the connection to the pool
5. Releases the semaphore permit

**Thread Safety:**
- Semaphore ensures only `maxConnections` queries run concurrently
- Connection allocation and return are atomic operations
- Proper cleanup occurs even if query fails

**Logging:**
- Logs when clients request connections
- Logs connection acquisition and release
- Tracks query execution progress

**Example:**
```typescript
const pool = new DatabaseConnectionPool(3);

// Multiple concurrent queries - only 3 will run at once
const queries = [
  pool.executeQuery("SELECT * FROM users", "Client-1"),
  pool.executeQuery("SELECT * FROM orders", "Client-2"),
  pool.executeQuery("SELECT * FROM products", "Client-3"),
  pool.executeQuery("SELECT * FROM inventory", "Client-4"), // Will wait
];

const results = await Promise.all(queries);
```

#### `getPoolStatus(): { total: number; available: number; busy: number }`

Returns the current status of the connection pool for monitoring and debugging.

**Returns:** Object with pool statistics:
- `total: number` - Total number of connections in the pool
- `available: number` - Number of connections currently available
- `busy: number` - Number of connections currently in use

**Example:**
```typescript
const status = pool.getPoolStatus();
console.log(`Pool Status - Total: ${status.total}, Available: ${status.available}, Busy: ${status.busy}`);
```

## Demonstration Function

### `async demonstrateConnectionPool()`

A comprehensive demonstration function that shows the connection pool behavior under concurrent load.

**Behavior:**
- Creates a pool with 3 connections
- Simulates 8 concurrent clients making database requests
- Monitors pool status during execution
- Demonstrates proper queuing and resource management

**Features Demonstrated:**
- **Concurrent Limiting**: Only 3 queries execute simultaneously
- **Queuing**: Additional requests wait for available connections
- **Status Monitoring**: Real-time pool status tracking
- **Proper Cleanup**: All connections are properly returned to the pool

## Usage Patterns

### Basic Connection Pool Usage

```typescript
const pool = new DatabaseConnectionPool(5); // 5 concurrent connections max

async function getUserData(userId: string) {
  const results = await pool.executeQuery(
    `SELECT * FROM users WHERE id = ${userId}`,
    `UserService-${userId}`
  );
  return results[0];
}

// Multiple concurrent requests - pool manages concurrency
const users = await Promise.all([
  getUserData("1"),
  getUserData("2"),
  getUserData("3"),
  // ... up to any number of requests
]);
```

### Production-Style Usage

```typescript
class UserRepository {
  constructor(private connectionPool: DatabaseConnectionPool) {}

  async findById(id: string): Promise<User | null> {
    const results = await this.connectionPool.executeQuery(
      `SELECT * FROM users WHERE id = $1`,
      `UserRepo.findById.${id}`
    );
    return results.length > 0 ? this.mapToUser(results[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const results = await this.connectionPool.executeQuery(
      `SELECT * FROM users WHERE email = $1`,
      `UserRepo.findByEmail.${email.substring(0, 10)}`
    );
    return results.length > 0 ? this.mapToUser(results[0]) : null;
  }

  async create(user: CreateUserData): Promise<User> {
    const results = await this.connectionPool.executeQuery(
      `INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *`,
      `UserRepo.create.${user.email.substring(0, 10)}`
    );
    return this.mapToUser(results[0]);
  }

  private mapToUser(row: any): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at
    };
  }
}

// Usage
const pool = new DatabaseConnectionPool(10);
const userRepo = new UserRepository(pool);

const users = await Promise.all([
  userRepo.findById("123"),
  userRepo.findByEmail("alice@example.com"),
  userRepo.create({ name: "Bob", email: "bob@example.com" })
]);
```

### Monitoring and Health Checks

```typescript
class MonitoredConnectionPool extends DatabaseConnectionPool {
  private stats = {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    averageQueryTime: 0
  };

  async executeQuery(sql: string, clientId: string): Promise<any[]> {
    const startTime = Date.now();
    this.stats.totalQueries++;

    try {
      const result = await super.executeQuery(sql, clientId);
      this.stats.successfulQueries++;
      
      // Update average query time
      const queryTime = Date.now() - startTime;
      this.stats.averageQueryTime = 
        (this.stats.averageQueryTime * (this.stats.successfulQueries - 1) + queryTime) /
        this.stats.successfulQueries;
        
      return result;
    } catch (error) {
      this.stats.failedQueries++;
      throw error;
    }
  }

  getHealthStatus() {
    const poolStatus = this.getPoolStatus();
    return {
      ...poolStatus,
      ...this.stats,
      successRate: this.stats.totalQueries > 0 
        ? this.stats.successfulQueries / this.stats.totalQueries 
        : 0,
      isHealthy: poolStatus.available > 0 && 
        this.stats.successRate > 0.95
    };
  }
}

// Usage with monitoring
const pool = new MonitoredConnectionPool(5);

// Health check endpoint
app.get('/health', (req, res) => {
  const health = pool.getHealthStatus();
  res.status(health.isHealthy ? 200 : 503).json(health);
});
```

## Resource Management Benefits

### 1. **Connection Reuse**
```typescript
// Connections are reused across requests
const pool = new DatabaseConnectionPool(3);

// These 6 requests will reuse the 3 connections
for (let i = 0; i < 6; i++) {
  await pool.executeQuery(`SELECT ${i}`, `Request-${i}`);
}
```

### 2. **Memory Efficiency**
- Fixed number of connections prevents memory leaks
- No connection creation overhead per request
- Predictable memory usage patterns

### 3. **Performance Optimization**
```typescript
// Bad: Creating connections per request (expensive)
async function badApproach(sql: string) {
  const connection = new DatabaseConnection(); // Expensive!
  const result = await connection.query(sql);
  // Connection lost after function ends
  return result;
}

// Good: Using connection pool (efficient)
async function goodApproach(sql: string) {
  return await pool.executeQuery(sql, "OptimizedClient");
  // Connection returned to pool for reuse
}
```

## Thread Safety and Resource Protection

### Semaphore Protection
- **Concurrent Limit**: Semaphore ensures only N connections are used simultaneously
- **Queuing**: Excess requests wait in FIFO order
- **No Resource Exhaustion**: Prevents database connection exhaustion

### Connection State Management
- **Double-Use Prevention**: Connections track their usage state
- **Proper Cleanup**: Try/finally ensures connections are always returned to pool
- **Error Handling**: Failed queries don't leak connections

## Performance Characteristics

| Aspect | Performance |
|--------|-------------|
| **Connection Acquisition** | O(1) when available, queued when pool exhausted |
| **Query Execution** | Limited by connection pool size |
| **Memory Usage** | O(n) where n = max connections |
| **Throughput** | Maximized up to pool limit |
| **Latency** | Minimal overhead beyond network latency |

## Configuration Best Practices

### Pool Size Selection
```typescript
// Consider these factors for pool size:
const cpuCores = os.cpus().length;
const expectedConcurrentUsers = 100;
const averageQueryTime = 50; // milliseconds
const targetResponseTime = 200; // milliseconds

// Rule of thumb: 2-3 connections per CPU core for I/O bound operations
const poolSize = Math.min(
  cpuCores * 3,
  Math.ceil(expectedConcurrentUsers * averageQueryTime / targetResponseTime)
);

const pool = new DatabaseConnectionPool(poolSize);
```

### Environment-Based Configuration
```typescript
const poolSize = process.env.NODE_ENV === 'production' 
  ? 20  // Higher concurrency for production
  : 5;  // Conservative for development

const pool = new DatabaseConnectionPool(poolSize);
```

## Real-World Applications

- **Web APIs**: Handling concurrent HTTP requests that need database access
- **Microservices**: Managing database connections in service-to-service calls
- **Background Jobs**: Processing queues of database-intensive tasks
- **Analytics**: Running concurrent analytical queries on large datasets
- **ETL Processes**: Extract, Transform, Load operations with controlled concurrency

## Comparison with Alternative Approaches

### Connection Pool vs Per-Request Connections

| Aspect | Connection Pool | Per-Request |
|--------|----------------|-------------|
| **Performance** | High (reuse) | Low (creation overhead) |
| **Memory** | Bounded | Unbounded |
| **Resource Usage** | Controlled | Can exhaust database |
| **Complexity** | Moderate | Simple |
| **Scalability** | Excellent | Poor |

### Connection Pool vs Global Connection

| Aspect | Connection Pool | Global Connection |
|--------|----------------|-------------------|
| **Concurrency** | High | None (serialized) |
| **Fault Tolerance** | Good (multiple connections) | Poor (single point of failure) |
| **Load Distribution** | Excellent | None |
| **Deadlock Risk** | Low | Higher |

This implementation showcases how semaphores can elegantly solve resource management problems in real-world applications, providing both performance and reliability benefits.
