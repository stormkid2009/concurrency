# Types and Interfaces - TypeScript Type Definitions

This file contains all TypeScript type definitions and interfaces used throughout the concurrency library.

## Banking Types

### `Action` Type

Represents the types of banking operations supported by the system.

```typescript
type Action = "deposit" | "withdraw" | "transfer";
```

**Values:**
- `"deposit"`: Adding money to an account
- `"withdraw"`: Removing money from an account
- `"transfer"`: Moving money between accounts

### `MessageType` Type

Represents the status/result of an operation.

```typescript
type MessageType = "success" | "failure" | "attempt";
```

**Values:**
- `"success"`: Operation completed successfully
- `"failure"`: Operation failed
- `"attempt"`: Operation is being attempted (in progress)

### `Message` Interface

Standardized message format for banking operations.

```typescript
interface Message {
  type: MessageType;
  action: Action;
  text: string;
}
```

**Properties:**
- `type`: The status of the message
- `action`: The banking action being performed
- `text`: Human-readable description

### `Messages` Object

Pre-defined message generators for consistent messaging across banking operations. Each action has three message generators: attempt, success, and failure.

```typescript
const Messages = {
  deposit: {
    attempt: (amount: number, name: string): Message,
    success: (amount: number, name: string): Message,
    failure: (reason: string): Message
  },
  withdraw: {
    attempt: (amount: number, name: string): Message,
    success: (amount: number, name: string): Message,
    failure: (reason: string): Message
  },
  transfer: {
    attempt: (amount: number, from: string, to: string): Message,
    success: (amount: number, from: string, to: string): Message,
    failure: (reason: string): Message
  }
}
```

**Usage Examples:**

```typescript
// Creating messages for different operations
const depositAttempt = Messages.deposit.attempt(100, "Alice");
// Returns: { type: "attempt", action: "deposit", text: "Attempting to deposit 100 to Alice's account..." }

const withdrawSuccess = Messages.withdraw.success(50, "Bob");
// Returns: { type: "success", action: "withdraw", text: "Successfully withdrew 50 from Bob's account." }

const transferFailure = Messages.transfer.failure("Insufficient funds");
// Returns: { type: "failure", action: "transfer", text: "Transfer failed: Insufficient funds" }
```

## API Response Types

### `GitHubUser` Interface

Represents a GitHub user object as returned by the GitHub API.

```typescript
interface GitHubUser {
  id: number;              // Unique user ID
  login: string;           // Username
  name: string;            // Display name
  public_repos: number;    // Number of public repositories
  followers: number;       // Number of followers
  following: number;       // Number of users being followed
  created_at: string;      // Account creation date (ISO string)
}
```

### `GitHubRepo` Interface

Represents a GitHub repository object as returned by the GitHub API.

```typescript
interface GitHubRepo {
  id: number;              // Unique repository ID
  name: string;            // Repository name
  full_name: string;       // Full name including owner (e.g., "owner/repo")
  description: string;     // Repository description
  stargazers_count: number; // Number of stars
  language: string;        // Primary programming language
}
```

### `OpenAIResponse` Interface

Represents the response format from OpenAI's Chat Completions API.

```typescript
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;     // The generated text content
    };
  }>;
}
```

## Type Safety and Validation

All interfaces are designed to match the actual API responses and provide compile-time type safety when working with external APIs. This ensures that:

1. **Banking operations** have consistent message formats
2. **API responses** are properly typed for safe property access
3. **Runtime errors** are reduced through TypeScript's type checking

## Best Practices

1. **Use the `Messages` object** for all banking operation messaging to ensure consistency
2. **Type your API responses** with the provided interfaces for better IDE support and error detection
3. **Handle null/undefined values** appropriately when working with optional fields in API responses

## Extension

These types can be extended for additional functionality:

```typescript
// Extending for new banking actions
type ExtendedAction = Action | "freeze" | "close";

// Adding custom message types
interface CustomMessage extends Message {
  timestamp: Date;
  userId: string;
}
```
