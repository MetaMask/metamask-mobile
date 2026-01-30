/**
 * Anthropic Claude Provider Implementation
 *
 * Wraps the @anthropic-ai/sdk to implement the ILLMProvider interface.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider } from './llm-provider';
import {
  ProviderType,
  LLMRequest,
  LLMResponse,
  LLMContentBlock,
  LLMMessage,
  LLMTool,
} from './types';
import { LLM_CONFIG } from '../config';

/**
 * Convert provider-agnostic messages to Anthropic format
 */
function toAnthropicMessages(messages: LLMMessage[]): Anthropic.MessageParam[] {
  return messages.map((msg) => ({
    role: msg.role,
    content:
      typeof msg.content === 'string'
        ? msg.content
        : msg.content.map((block) => {
            if (block.type === 'text') {
              return { type: 'text' as const, text: block.text };
            }
            if (block.type === 'tool_use') {
              return {
                type: 'tool_use' as const,
                id: block.id,
                name: block.name,
                input: block.input,
              };
            }
            // tool_result
            return {
              type: 'tool_result' as const,
              tool_use_id: block.tool_use_id,
              content: block.content,
            };
          }),
  }));
}

/**
 * Convert provider-agnostic tools to Anthropic format
 */
function toAnthropicTools(tools: LLMTool[]): Anthropic.Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema as Anthropic.Tool['input_schema'],
  }));
}

/**
 * Convert Anthropic response content to provider-agnostic format
 */
function fromAnthropicContent(
  content: Anthropic.ContentBlock[],
): LLMContentBlock[] {
  return content.map((block) => {
    if (block.type === 'text') {
      return { type: 'text' as const, text: block.text };
    }
    if (block.type === 'tool_use') {
      return {
        type: 'tool_use' as const,
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      };
    }
    // Handle other block types as text
    return { type: 'text' as const, text: '' };
  });
}

/**
 * Anthropic Claude provider implementation
 */
export class AnthropicProvider implements ILLMProvider {
  readonly providerId: ProviderType = 'anthropic';
  readonly displayName = 'Anthropic Claude';

  private client: Anthropic | null = null;
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env[LLM_CONFIG.providers.anthropic.envKey];
  }

  /**
   * Lazily initialize the Anthropic client
   */
  private getClient(): Anthropic {
    if (!this.client) {
      if (!this.apiKey) {
        throw new Error(
          `Anthropic API key not found. Set ${LLM_CONFIG.providers.anthropic.envKey} environment variable.`,
        );
      }
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
    return this.client;
  }

  async createMessage(request: LLMRequest): Promise<LLMResponse> {
    const client = this.getClient();

    const anthropicRequest: Anthropic.MessageCreateParams = {
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      messages: toAnthropicMessages(request.messages),
    };

    if (request.system) {
      anthropicRequest.system = request.system;
    }

    if (request.tools && request.tools.length > 0) {
      anthropicRequest.tools = toAnthropicTools(request.tools);
    }

    const response = await client.messages.create(anthropicRequest);

    return {
      content: fromAnthropicContent(response.content),
      model: response.model,
      stopReason: response.stop_reason || 'end_turn',
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const client = this.getClient();
      await client.messages.create({
        model: this.getDefaultModel(),
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultModel(): string {
    return LLM_CONFIG.providers.anthropic.model;
  }
}
