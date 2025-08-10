import Semaphore from "./semaphore.js";
import {GitHubUser,GitHubRepo,OpenAIResponse} from "./types.js";


// Example 1: GitHub API Client
class GitHubAPIClient {
  private semaphore = new Semaphore(5); // GitHub allows ~5000/hour, so 5 concurrent
  private baseURL = "https://api.github.com";

  // Fixed: Return Promise<GitHubUser> instead of Promise<void>
  async getUser(username: string): Promise<GitHubUser> {
    return await this.semaphore.withPermit(async () => {
      console.log(`🔍 Fetching GitHub user: ${username}`);
      const response = await fetch(`${this.baseURL}/users/${username}`);

      if (response.status === 429) {
        console.log("⏰ Rate limited! Waiting...");
        await this.sleep(60000); // Wait 1 minute
        return this.getUser(username); // Retry
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      console.log(`✅ Got user data for: ${username}`);
      const userData = await response.json() as GitHubUser;
      return userData; // Fixed: Actually return the data
    });
  }

  // Fixed: Return Promise<GitHubRepo[]> instead of Promise<void>
  async getUserRepos(username: string): Promise<GitHubRepo[]> {
    return await this.semaphore.withPermit(async () => {
      console.log(`📂 Fetching repos for: ${username}`);
      const response = await fetch(`${this.baseURL}/users/${username}/repos`);

      if (response.status === 429) {
        const resetTime = response.headers.get("X-RateLimit-Reset");
        const waitTime = resetTime
          ? parseInt(resetTime) * 1000 - Date.now()
          : 60000;
        console.log(`⏰ Rate limited! Waiting ${waitTime / 1000}s...`);
        await this.sleep(waitTime);
        return this.getUserRepos(username);
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      console.log(`✅ Got repos for: ${username}`);
      const repoData = await response.json() as GitHubRepo[];
      return repoData; // Fixed: Actually return the data
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Example 2: OpenAI API Client
class OpenAIClient {
  private semaphore = new Semaphore(3); // OpenAI has strict limits
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Fixed: Return Promise<string> instead of Promise<void>
  async generateText(prompt: string): Promise<string> {
    return await this.semaphore.withPermit(async () => {
      console.log(
        `🤖 Generating text for prompt: ${prompt.substring(0, 50)}...`,
      );

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 100,
          }),
        },
      );

      if (response.status === 429) {
        console.log("⏰ OpenAI rate limit hit! Waiting...");
        await this.sleep(20000); // Wait 20 seconds
        return this.generateText(prompt);
      }

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Safe navigation with optional chaining
      const content = data?.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error('Invalid OpenAI response:', data);
        throw new Error('OpenAI API returned invalid or empty response');
      }
      
      console.log(`✅ Generated text successfully`);
      return content;
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Example 3: Generic HTTP Client with Smart Rate Limiting
class SmartHTTPClient {
  private semaphores = new Map<string, Semaphore>();

  // Different domains get different limits
  private getDomainLimits(domain: string): number {
    const limits = {
      "api.github.com": 5,
      "api.openai.com": 3,
      "api.twitter.com": 10,
      "jsonplaceholder.typicode.com": 20, // Demo API, can handle more
    };
    return limits[domain as keyof typeof limits] || 5; // Default: 5
  }

  private getSemaphore(url: string): Semaphore {
    const domain = new URL(url).hostname;

    if (!this.semaphores.has(domain)) {
      const limit = this.getDomainLimits(domain);
      console.log(`🔧 Creating semaphore for ${domain} with limit ${limit}`);
      this.semaphores.set(domain, new Semaphore(limit));
    }

    return this.semaphores.get(domain)!;
  }

  // Fixed: Return Promise<Response> instead of Promise<void>
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const semaphore = this.getSemaphore(url);
    const domain = new URL(url).hostname;

    return await semaphore.withPermit(async () => {
      console.log(`🌐 [${domain}] Making request to: ${url}`);

      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
        console.log(
          `⏰ [${domain}] Rate limited! Waiting ${waitTime / 1000}s...`,
        );
        await this.sleep(waitTime);
        return this.fetch(url, options); // Retry
      }

      console.log(`✅ [${domain}] Request completed: ${response.status}`);
      return response; // Fixed: Actually return the response
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Demo: Using all three clients
async function demonstrateRealAPIUsage() {
  console.log("🚀 Starting real API demonstrations...\n");

  // Demo 1: GitHub API
  const github = new GitHubAPIClient();
  const githubUsers = [
    "octocat",
    "torvalds",
    "gaearon",
    "addyosmani",
    "sindresorhus",
  ];

  console.log("📱 GitHub API Demo:");
  const githubPromises = githubUsers.map(async (username, i) => {
    // Stagger requests slightly
    await new Promise((resolve) => setTimeout(resolve, i * 200));
    try {
      const user = await github.getUser(username);
      // Fixed: Now we can access user properties safely
      console.log(`👤 ${username}: ${user.name || 'No name'} (${user.public_repos} repos)`);
      return user;
    } catch (error) {
      console.error(`❌ Error fetching ${username}:`, (error as Error).message);
      return null; // Return null on error
    }
  });

  await Promise.all(githubPromises);
  console.log("\n");

  // Demo 2: Generic HTTP Client with Multiple APIs
  const httpClient = new SmartHTTPClient();
  console.log("🌐 Multi-API Demo:");

  const mixedRequests = [
    "https://jsonplaceholder.typicode.com/users/1",
    "https://jsonplaceholder.typicode.com/posts/1",
    "https://api.github.com/users/octocat",
    "https://jsonplaceholder.typicode.com/users/2",
    "https://api.github.com/users/torvalds",
    "https://jsonplaceholder.typicode.com/posts/2",
  ];

  const mixedPromises = mixedRequests.map(async (url, i) => {
    await new Promise((resolve) => setTimeout(resolve, i * 100));
    try {
      const response = await httpClient.fetch(url);
      // Fixed: Check if response is ok before parsing JSON
      if (response.ok) {
        const data = await response.json();
        console.log(`📄 ${url}: Success`);
        return data;
      } else {
        console.log(`⚠️ ${url}: HTTP ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error with ${url}:`, (error as Error).message);
      return null; // Return null on error
    }
  });

  await Promise.all(mixedPromises);
  console.log("\n✅ All API demonstrations completed!");
}

// Example of how to use these classes properly
async function properUsageExample() {
  const github = new GitHubAPIClient();
  
  try {
    // Now we get proper type safety
    const user: GitHubUser = await github.getUser("octocat");
    console.log(`User ${user.login} has ${user.public_repos} repos`);
    
    const repos: GitHubRepo[] = await github.getUserRepos("octocat");
    console.log(`Found ${repos.length} repositories`);
    
    // Type-safe access to repo properties
    repos.forEach(repo => {
      console.log(`- ${repo.name}: ${repo.stargazers_count} stars`);
    });
    
  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

// Uncomment to run the demos
// demonstrateRealAPIUsage().catch(console.error);
// properUsageExample().catch(console.error);
