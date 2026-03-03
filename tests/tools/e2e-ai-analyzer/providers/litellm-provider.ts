/**
 * LiteLLM Provider Implementation
 *
 * Uses OpenAI-compatible API with custom base URL.
 * LiteLLM is a proxy that provides unified access to multiple LLM providers.
 */

import OpenAI from 'openai';
import { ILLMProvider } from './llm-provider';
import {
  ProviderType,
  LLMRequest,
  LLMResponse,
  LLMContentBlock,
  LLMTextBlock,
  LLMToolUseBlock,
  LLMToolResultBlock,
  LLMMessage,
  LLMTool,
} from './types';
import { LLM_CONFIG } from '../config';

/**
 * Convert provider-agnostic tools to OpenAI format
 */
function toOpenAITools(
  tools: LLMTool[],
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

/**
 * Convert provider-agnostic messages to OpenAI format
 */
function toOpenAIMessages(
  messages: LLMMessage[],
  systemPrompt?: string,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [];

  if (systemPrompt) {
    openAIMessages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      openAIMessages.push({
        role: msg.role,
        content: msg.content,
      });
    } else {
      const textBlocks = msg.content.filter(
        (b): b is LLMTextBlock => b.type === 'text',
      );
      const toolUseBlocks = msg.content.filter(
        (b): b is LLMToolUseBlock => b.type === 'tool_use',
      );
      const toolResultBlocks = msg.content.filter(
        (b): b is LLMToolResultBlock => b.type === 'tool_result',
      );

      if (msg.role === 'assistant') {
        const textContent = textBlocks.map((b) => b.text).join('\n');
        const toolCalls = toolUseBlocks.map((block) => ({
          id: block.id,
          type: 'function' as const,
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        }));

        if (toolCalls.length > 0) {
          openAIMessages.push({
            role: 'assistant',
            content: textContent || null,
            tool_calls: toolCalls,
          });
        } else {
          openAIMessages.push({
            role: 'assistant',
            content: textContent,
          });
        }
      } else {
        for (const block of toolResultBlocks) {
          openAIMessages.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: block.content,
          });
        }

        if (textBlocks.length > 0) {
          const textContent = textBlocks.map((b) => b.text).join('\n');
          openAIMessages.push({
            role: 'user',
            content: textContent,
          });
        }
      }
    }
  }

  return openAIMessages;
}

/**
 * Convert OpenAI response to provider-agnostic format
 */
function fromOpenAIResponse(
  choice: OpenAI.Chat.Completions.ChatCompletion.Choice,
): LLMContentBlock[] {
  const content: LLMContentBlock[] = [];
  const message = choice.message;

  if (message.content) {
    content.push({
      type: 'text',
      text: message.content,
    });
  }

  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      content.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.function.name,
        input: JSON.parse(toolCall.function.arguments || '{}'),
      });
    }
  }

  return content;
}

/**
 * Map OpenAI finish reason to standardized stop reason
 */
function mapFinishReason(
  finishReason: OpenAI.Chat.Completions.ChatCompletion.Choice['finish_reason'],
): string {
  switch (finishReason) {
    case 'stop':
      return 'end_turn';
    case 'tool_calls':
      return 'tool_use';
    case 'length':
      return 'max_tokens';
    case 'content_filter':
      return 'content_filter';
    default:
      return 'end_turn';
  }
}

/**
 * LiteLLM provider implementation
 */
export class LiteLLMProvider implements ILLMProvider {
  readonly providerId: ProviderType = 'litellm';
  readonly displayName = 'LiteLLM';

  private client: OpenAI | null = null;
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor() {
    const config = LLM_CONFIG.providers.litellm;
    this.apiKey = process.env[config.envKey];
    this.baseUrl = config.baseUrl || 'https://litellm.consensys.info';
  }

  private getClient(): OpenAI {
    if (!this.client) {
      if (!this.apiKey) {
        throw new Error(
          `LiteLLM API key not found. Set E2E_LITELLM_API_KEY environment variable.`,
        );
      }
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
      });
    }
    return this.client;
  }

  async createMessage(request: LLMRequest): Promise<LLMResponse> {
    const client = this.getClient();

    const openAIRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
      {
        model: request.model,
        max_tokens: request.maxTokens,
        messages: toOpenAIMessages(request.messages, request.system),
        temperature: request.temperature ?? 0,
      };

    if (request.tools && request.tools.length > 0) {
      openAIRequest.tools = toOpenAITools(request.tools);
    }

    const response = await client.chat.completions.create(openAIRequest);

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response choice from LiteLLM');
    }

    return {
      content: fromOpenAIResponse(choice),
      model: response.model,
      stopReason: mapFinishReason(choice.finish_reason),
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const client = this.getClient();
      await client.chat.completions.create({
        model: this.getDefaultModel(),
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`   LiteLLM error: ${msg}`);
      return false;
    }
  }

  getDefaultModel(): string {
    return LLM_CONFIG.providers.litellm.model;
  }
}
