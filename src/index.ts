// Main module exports for the concurrency library

// Export core concurrency primitives
export { default as Mutex } from './mutex.js';
export { default as Semaphore } from './semaphore.js';

// Export bank account implementation
export { SafeBankAccount } from './bank-account.js';

// Export database connection pool
export { DatabaseConnectionPool } from './db-connection.js';

// Export all types and interfaces
export {
  Action,
  MessageType,
  Message,
  Messages,
  GitHubUser,
  GitHubRepo,
  OpenAIResponse
} from './types.js';

// Note: API implementations are not exported by default as they contain
// class definitions that users might want to instantiate directly
// You can import them directly:
// import { GitHubAPIClient, OpenAIClient, SmartHTTPClient } from './api-implementation.js'
