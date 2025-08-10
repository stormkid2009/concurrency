// types.ts

export type Action = "deposit" | "withdraw" | "transfer";

export type MessageType = "success" | "failure" | "attempt";

export interface Message {
  type: MessageType;
  action: Action;
  text: string;
}

export const Messages = {
  deposit: {
    attempt: (amount: number, name: string): Message => ({
      type: "attempt",
      action: "deposit",
      text: `Attempting to deposit ${amount} to ${name}'s account...`,
    }),
    success: (amount: number, name: string): Message => ({
      type: "success",
      action: "deposit",
      text: `Successfully deposited ${amount} to ${name}'s account.`,
    }),
    failure: (reason: string): Message => ({
      type: "failure",
      action: "deposit",
      text: `Deposit failed: ${reason}`,
    }),
  },

  withdraw: {
    attempt: (amount: number, name: string): Message => ({
      type: "attempt",
      action: "withdraw",
      text: `Attempting to withdraw ${amount} from ${name}'s account...`,
    }),
    success: (amount: number, name: string): Message => ({
      type: "success",
      action: "withdraw",
      text: `Successfully withdrew ${amount} from ${name}'s account.`,
    }),
    failure: (reason: string): Message => ({
      type: "failure",
      action: "withdraw",
      text: `Withdrawal failed: ${reason}`,
    }),
  },

  transfer: {
    attempt: (amount: number, from: string, to: string): Message => ({
      type: "attempt",
      action: "transfer",
      text: `Attempting to transfer ${amount} from ${from} to ${to}...`,
    }),
    success: (amount: number, from: string, to: string): Message => ({
      type: "success",
      action: "transfer",
      text: `Transferred ${amount} from ${from} to ${to} successfully.`,
    }),
    failure: (reason: string): Message => ({
      type: "failure",
      action: "transfer",
      text: `Transfer failed: ${reason}`,
    }),
  },
};

// Define proper TypeScript interfaces for API responses
export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  stargazers_count: number;
  language: string;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
