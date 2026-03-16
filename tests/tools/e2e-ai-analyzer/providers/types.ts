/**
 * Provider-Agnostic LLM Types
 *
 * These types abstract away provider-specific implementations,
 * allowing the analyzer to work with multiple LLM providers.
 */

/**
 * Supported LLM provider types
 */
export type ProviderType = 'anthropic' | 'openai' | 'google';

/**
 * Content block types used in messages
 */
export interface LLMTextBlock {
  type: 'text';
  text: string;
}

export interface LLMToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

export type LLMContentBlock =
  | LLMTextBlock
  | LLMToolUseBlock
  | LLMToolResultBlock;

/**
 * Message in conversation history
 */
export interface LLMMessage {
  role: 'user' | 'assistant';
  content: LLMContentBlock[] | string;
}

/**
 * Tool definition (provider-agnostic)
 * Uses JSON Schema format for input_schema
 */
export interface LLMTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * Request to create a message/completion
 */
export interface LLMRequest {
  model: string;
  maxTokens: number;
  temperature?: number;
  system?: string;
  tools?: LLMTool[];
  messages: LLMMessage[];
}

/**
 * Response from creating a message/completion
 */
export interface LLMResponse {
  content: LLMContentBlock[];
  model: string;
  stopReason: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  model: string;
  envKey: string;
}
