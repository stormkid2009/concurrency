# API Implementation Classes - Rate-Limited HTTP Clients

This file contains three classes that demonstrate practical applications of semaphores for rate-limiting API calls and managing concurrent HTTP requests. These implementations showcase real-world patterns for interacting with external services while respecting their rate limits.

## Classes Overview

### 1. `GitHubAPIClient`
Rate-limited client for GitHub API with automatic retry logic and proper error handling.

### 2. `OpenAIClient`
Rate-limited client for OpenAI API with conservative concurrency limits and response validation.

### 3. `SmartHTTPClient`
Generic HTTP client with domain-specific rate limiting and intelligent retry mechanisms.

## GitHubAPIClient Class

### Overview

A specialized client for GitHub API that implements rate limiting using a semaphore to respect GitHub's API limits (~5000 requests/hour).

### Properties

- **`semaphore: Semaphore`** (private): Limits concurrent requests to 5
- **`baseURL: string`** (private): GitHub API base URL ("https://api.github.com")

### Methods

#### `async getUser(username: string): Promise<GitHubUser>`

Fetches user information from GitHub API with automatic rate limit handling.

**Parameters:**
- `username: string` - GitHub username to fetch

**Returns:** `Promise<GitHubUser>` - User data with proper TypeScript typing

**Features:**
- **Rate Limiting**: Maximum 5 concurrent requests
- **Retry Logic**: Automatically retries on 429 (rate limit) responses
- **Error Handling**: Proper HTTP error status handling
- **Type Safety**: Returns properly typed GitHubUser interface

**Behavior:**
1. Acquires semaphore permit
2. Makes HTTP request to GitHub API
3. Handles rate limiting (429 status) with automatic retry
4. Validates response and returns typed data
5. Releases semaphore permit

**Example:**
```typescript
const github = new GitHubAPIClient();
const user = await github.getUser("octocat");
console.log(`${user.name} has ${user.public_repos} repositories`);
```

#### `async getUserRepos(username: string): Promise<GitHubRepo[]>`

Fetches repository list for a GitHub user with intelligent rate limit handling.

**Parameters:**
- `username: string` - GitHub username whose repositories to fetch

**Returns:** `Promise<GitHubRepo[]>` - Array of repository data

**Features:**
- **Smart Retry**: Uses `X-RateLimit-Reset` header for optimal retry timing
- **Concurrent Protection**: Respects the shared semaphore limit
- **Type Safety**: Returns array of properly typed GitHubRepo objects

**Advanced Rate Limiting:**
- Checks `X-RateLimit-Reset` header for precise retry timing
- Calculates optimal wait time based on rate limit reset time
- Falls back to default wait time if header unavailable

**Example:**
```typescript
const repos = await github.getUserRepos("torvalds");
repos.forEach(repo => {
  console.log(`${repo.name}: ${repo.stargazers_count} stars`);
});
```

## OpenAIClient Class

### Overview

A conservative client for OpenAI API that implements strict rate limiting due to OpenAI's usage-based pricing and tight rate limits.

### Properties

- **`semaphore: Semaphore`** (private): Limits concurrent requests to 3
- **`apiKey: string`** (private): OpenAI API key for authentication

### Constructor

#### `constructor(apiKey: string)`

Creates a new OpenAI client with the provided API key.

**Parameters:**
- `apiKey: string` - OpenAI API key for authentication

### Methods

#### `async generateText(prompt: string): Promise<string>`

Generates text using OpenAI's chat completion API with comprehensive error handling.

**Parameters:**
- `prompt: string` - The text prompt to send to OpenAI

**Returns:** `Promise<string>` - Generated text content

**Features:**
- **Conservative Rate Limiting**: Only 3 concurrent requests due to strict API limits
- **Robust Error Handling**: Validates API responses and handles edge cases
- **Safe Response Parsing**: Uses optional chaining to safely navigate response structure
- **Automatic Retry**: Retries on rate limit errors with appropriate delays

**Security Considerations:**
- Properly handles API keys
- Validates response structure before returning data
- Provides detailed error messages for debugging

**Example:**
```typescript
const openai = new OpenAIClient(process.env.OPENAI_API_KEY!);
const response = await openai.generateText("Write a haiku about programming");
console.log(response);
```

**Response Validation:**
```typescript
const content = data?.choices?.[0]?.message?.content;
if (!content) {
  console.error('Invalid OpenAI response:', data);
  throw new Error('OpenAI API returned invalid or empty response');
}
```

## SmartHTTPClient Class

### Overview

A generic HTTP client that automatically manages rate limits for different domains using domain-specific semaphores. This demonstrates advanced semaphore usage with dynamic resource allocation.

### Properties

- **`semaphores: Map<string, Semaphore>`** (private): Maps domains to their specific semaphores

### Methods

#### `private getDomainLimits(domain: string): number`

Determines appropriate rate limits for different domains based on known API characteristics.

**Parameters:**
- `domain: string` - The domain to get limits for

**Returns:** `number` - Maximum concurrent requests for the domain

**Domain-Specific Limits:**
- `api.github.com`: 5 concurrent requests
- `api.openai.com`: 3 concurrent requests (strict)
- `api.twitter.com`: 10 concurrent requests
- `jsonplaceholder.typicode.com`: 20 concurrent requests (demo API)
- Default: 5 concurrent requests for unknown domains

#### `private getSemaphore(url: string): Semaphore`

Gets or creates a semaphore for the specified URL's domain.

**Parameters:**
- `url: string` - The full URL to get a semaphore for

**Returns:** `Semaphore` - Domain-specific semaphore

**Features:**
- **Lazy Initialization**: Creates semaphores only when needed
- **Domain Extraction**: Automatically extracts domain from URLs
- **Caching**: Reuses existing semaphores for the same domain

#### `async fetch(url: string, options?: RequestInit): Promise<Response>`

Makes HTTP requests with domain-specific rate limiting and intelligent retry logic.

**Parameters:**
- `url: string` - URL to fetch
- `options?: RequestInit` - Optional fetch options

**Returns:** `Promise<Response>` - HTTP response

**Features:**
- **Automatic Domain Detection**: Determines rate limits based on URL domain
- **Intelligent Retry**: Uses `Retry-After` header when available
- **Comprehensive Logging**: Tracks requests per domain for debugging
- **Error Handling**: Proper HTTP error handling with context

**Smart Retry Logic:**
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get("Retry-After");
  const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
  console.log(`⏰ [${domain}] Rate limited! Waiting ${waitTime / 1000}s...`);
  await this.sleep(waitTime);
  return this.fetch(url, options); // Recursive retry
}
```

**Example:**
```typescript
const client = new SmartHTTPClient();

// These requests automatically get appropriate rate limiting
const responses = await Promise.all([
  client.fetch('https://api.github.com/users/octocat'),
  client.fetch('https://api.openai.com/v1/models'),
  client.fetch('https://jsonplaceholder.typicode.com/users/1'),
]);
```

## Demonstration Functions

### `async demonstrateRealAPIUsage()`

Comprehensive demonstration showing all three clients working together with concurrent requests.

**Features Demonstrated:**
- **Concurrent API Calls**: Multiple requests to different services
- **Rate Limit Respect**: Each service gets appropriate rate limiting
- **Error Handling**: Graceful handling of API failures
- **Type Safety**: Proper TypeScript typing throughout

### `async properUsageExample()`

Shows proper usage patterns with full type safety and error handling.

**Features:**
- **Type-Safe Access**: Demonstrates proper TypeScript usage
- **Error Boundaries**: Proper try/catch patterns
- **Result Processing**: Safe access to API response data

## Usage Patterns

### Multi-Service Integration

```typescript
class APIOrchestrator {
  private github = new GitHubAPIClient();
  private openai = new OpenAIClient(process.env.OPENAI_API_KEY!);
  private http = new SmartHTTPClient();

  async getUserInsights(username: string) {
    try {
      // Concurrent API calls with automatic rate limiting
      const [user, repos] = await Promise.all([
        this.github.getUser(username),
        this.github.getUserRepos(username)
      ]);

      // Generate AI insights about the user
      const prompt = `Analyze this GitHub profile: ${user.name} has ${user.public_repos} repos. 
        Top languages: ${repos.slice(0, 5).map(r => r.language).join(', ')}`;
        
      const insights = await this.openai.generateText(prompt);

      return {
        user,
        repos: repos.slice(0, 10), // Top 10 repos
        insights
      };
    } catch (error) {
      console.error('Error fetching user insights:', error);
      throw error;
    }
  }
}

// Usage
const orchestrator = new APIOrchestrator();
const insights = await orchestrator.getUserInsights('octocat');
```

### Batch Processing with Rate Limiting

```typescript
async function processUsers(usernames: string[]) {
  const github = new GitHubAPIClient();
  const results = [];

  // Process in batches to respect rate limits
  const batchSize = 5; // Match semaphore limit
  for (let i = 0; i < usernames.length; i += batchSize) {
    const batch = usernames.slice(i, i + batchSize);
    
    // Concurrent processing within rate limits
    const batchResults = await Promise.all(
      batch.map(async username => {
        try {
          const [user, repos] = await Promise.all([
            github.getUser(username),
            github.getUserRepos(username)
          ]);
          return { user, repos, error: null };
        } catch (error) {
          return { user: null, repos: null, error: error.message };
        }
      })
    );
    
    results.push(...batchResults);
    
    // Optional: Brief pause between batches
    if (i + batchSize < usernames.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Usage
const usernames = ['octocat', 'torvalds', 'gaearon', 'sindresorhus'];
const results = await processUsers(usernames);
```

### Environment-Specific Configuration

```typescript
class ConfigurableAPIClient extends SmartHTTPClient {
  constructor(private environment: 'development' | 'production') {
    super();
  }

  protected getDomainLimits(domain: string): number {
    const baseLimits = super.getDomainLimits(domain);
    
    // Reduce limits in development to be more conservative
    if (this.environment === 'development') {
      return Math.max(1, Math.floor(baseLimits / 2));
    }
    
    return baseLimits;
  }
}

// Usage
const client = new ConfigurableAPIClient(
  process.env.NODE_ENV === 'production' ? 'production' : 'development'
);
```

## Rate Limiting Strategies

### 1. **Conservative Approach (OpenAI)**
```typescript
// Very low concurrency for expensive/limited APIs
private semaphore = new Semaphore(3);
```

### 2. **Moderate Approach (GitHub)**
```typescript
// Balanced concurrency for well-provisioned APIs
private semaphore = new Semaphore(5);
```

### 3. **Adaptive Approach (SmartHTTPClient)**
```typescript
// Domain-specific limits based on service characteristics
const limits = {
  "api.github.com": 5,
  "api.openai.com": 3,
  "api.twitter.com": 10,
  "jsonplaceholder.typicode.com": 20
};
```

## Error Handling Patterns

### Retry with Exponential Backoff
```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const user = await retryWithBackoff(() => github.getUser('octocat'));
```

### Circuit Breaker Pattern
```typescript
class CircuitBreakerAPIClient extends GitHubAPIClient {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly maxFailures = 5;
  private readonly resetTimeout = 60000; // 1 minute

  async getUser(username: string): Promise<GitHubUser> {
    if (this.isCircuitOpen()) {
      throw new Error('Circuit breaker is open - too many recent failures');
    }

    try {
      const result = await super.getUser(username);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isCircuitOpen(): boolean {
    if (this.failures >= this.maxFailures) {
      return Date.now() - this.lastFailureTime < this.resetTimeout;
    }
    return false;
  }

  private onSuccess(): void {
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}
```

## Performance and Monitoring

### Request Tracking
```typescript
class MonitoredAPIClient extends SmartHTTPClient {
  private stats = new Map<string, {
    requests: number;
    failures: number;
    totalTime: number;
  }>();

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const domain = new URL(url).hostname;
    const startTime = Date.now();
    
    try {
      const response = await super.fetch(url, options);
      this.recordSuccess(domain, Date.now() - startTime);
      return response;
    } catch (error) {
      this.recordFailure(domain);
      throw error;
    }
  }

  private recordSuccess(domain: string, duration: number): void {
    const stats = this.stats.get(domain) || { requests: 0, failures: 0, totalTime: 0 };
    stats.requests++;
    stats.totalTime += duration;
    this.stats.set(domain, stats);
  }

  private recordFailure(domain: string): void {
    const stats = this.stats.get(domain) || { requests: 0, failures: 0, totalTime: 0 };
    stats.failures++;
    this.stats.set(domain, stats);
  }

  getStats() {
    const result = new Map();
    for (const [domain, stats] of this.stats) {
      result.set(domain, {
        ...stats,
        averageTime: stats.requests > 0 ? stats.totalTime / stats.requests : 0,
        successRate: stats.requests > 0 ? (stats.requests - stats.failures) / stats.requests : 0
      });
    }
    return result;
  }
}
```

## Real-World Applications

- **Data Aggregation**: Collecting data from multiple APIs for dashboards
- **Social Media Management**: Posting to multiple platforms with rate limiting
- **E-commerce Integration**: Syncing products across multiple marketplaces
- **Monitoring Systems**: Checking multiple services without overwhelming them
- **Content Distribution**: Publishing content to various platforms
- **API Proxies**: Building rate-limited proxies for internal services

These implementations demonstrate how semaphores can elegantly solve complex rate limiting challenges in modern applications that integrate with multiple external services.
