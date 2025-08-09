import Semaphore from "./semaphore.js";
// Mock database connection
class DatabaseConnection {
  private static idCounter = 0;
  public readonly id: number;
  private inUse = false;

  constructor() {
    this.id = ++DatabaseConnection.idCounter;
  }

  async query(sql: string): Promise<any[]> {
    if (this.inUse) {
      throw new Error(`Connection ${this.id} is already in use!`);
    }

    this.inUse = true;
    console.log(`🔍 Connection ${this.id}: Executing query: ${sql}`);

    // Simulate database query time
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 1000 + 500),
    );

    const result = [{ data: `Result from connection ${this.id}` }];
    console.log(`✅ Connection ${this.id}: Query completed`);

    this.inUse = false;
    return result;
  }
}

export class DatabaseConnectionPool {
  private connections: DatabaseConnection[] = [];
  private availableConnections: DatabaseConnection[] = [];
  private semaphore: Semaphore;

  constructor(private maxConnections: number = 3) {
    this.semaphore = new Semaphore(maxConnections);

    // Create the connection pool
    for (let i = 0; i < maxConnections; i++) {
      const conn = new DatabaseConnection();
      this.connections.push(conn);
      this.availableConnections.push(conn);
    }

    console.log(`🏊 Database pool created with ${maxConnections} connections`);
  }

  async executeQuery(sql: string, clientId: string): Promise<any[]> {
    console.log(`📋 Client ${clientId}: Requesting connection for query`);

    // Semaphore ensures only maxConnections queries run concurrently
    return await this.semaphore.withPermit(async () => {
      // Get an available connection
      const connection = this.availableConnections.pop();
      if (!connection) {
        throw new Error("No connections available (this shouldn't happen)");
      }

      console.log(
        `🔌 Client ${clientId}: Acquired connection ${connection.id}`,
      );

      try {
        const result = await connection.query(sql);
        return result;
      } finally {
        // Return connection to pool
        this.availableConnections.push(connection);
        console.log(
          `🔄 Client ${clientId}: Released connection ${connection.id}`,
        );
      }
    });
  }

  getPoolStatus(): { total: number; available: number; busy: number } {
    return {
      total: this.connections.length,
      available: this.availableConnections.length,
      busy: this.connections.length - this.availableConnections.length,
    };
  }
}

// Usage example and demonstration
async function demonstrateConnectionPool() {
  const pool = new DatabaseConnectionPool(3); // Max 3 concurrent connections

  console.log("\n🚀 Starting concurrent database operations...\n");

  // Simulate multiple clients making concurrent requests
  const clients = Array.from({ length: 8 }, (_, i) => `Client-${i + 1}`);

  const operations = clients.map(async (clientId, index) => {
    const delay = index * 100; // Stagger the requests slightly
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const result = await pool.executeQuery(
        `SELECT * FROM users WHERE id = ${index + 1}`,
        clientId,
      );
      console.log(`📊 ${clientId}: Got result:`, result[0]);
      return result;
    } catch (error) {
      console.error(`❌ ${clientId}: Error:`, error.message);
      throw error;
    }
  });

  // Monitor pool status during execution
  const statusMonitor = setInterval(() => {
    const status = pool.getPoolStatus();
    console.log(
      `📈 Pool Status - Total: ${status.total}, Available: ${status.available}, Busy: ${status.busy}`,
    );
  }, 300);

  try {
    await Promise.all(operations);
    console.log("\n✅ All database operations completed successfully!");
  } finally {
    clearInterval(statusMonitor);
  }
}

// Comparison: What would happen with a mutex?
export class MutexDatabasePool {
  private connections: DatabaseConnection[] = [];
  private currentConnectionIndex = 0;

  constructor(maxConnections: number = 3) {
    for (let i = 0; i < maxConnections; i++) {
      this.connections.push(new DatabaseConnection());
    }
  }

  // With mutex: Only ONE query at a time, even though we have multiple connections!
  async executeQueryWithMutex(sql: string, clientId: string): Promise<any[]> {
    // This would serialize ALL database access, wasting our connection pool
    console.log(`🐌 ${clientId}: Waiting for exclusive access (SLOW!)`);

    const connection = this.connections[0]; // Always use first connection
    return await connection.query(sql);
  }
}

// Run the demonstration
console.log("=== Database Connection Pool with Semaphore ===");
demonstrateConnectionPool().catch(console.error);
