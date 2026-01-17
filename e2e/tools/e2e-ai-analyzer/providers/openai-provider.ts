/**
 * OpenAI GPT Provider Implementation
 *
 * Wraps the openai SDK to implement the ILLMProvider interface.
 */

import OpenAI from 'openai';
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

  // OpenAI puts system message in the messages array
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
      // Handle content blocks
      const textBlocks = msg.content.filter((b) => b.type === 'text');
      const toolUseBlocks = msg.content.filter((b) => b.type === 'tool_use');
      const toolResultBlocks = msg.content.filter(
        (b) => b.type === 'tool_result',
      );

      if (msg.role === 'assistant') {
        // Assistant message with potential tool calls
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
        // User message - could be text, tool results, or both
        // Tool results must be sent as separate 'tool' role messages in OpenAI
        for (const block of toolResultBlocks) {
          openAIMessages.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: block.content,
          });
        }

        // Add text content as user message if present
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

  // Add text content if present
  if (message.content) {
    content.push({
      type: 'text',
      text: message.content,
    });
  }

  // Add tool calls if present
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
 * OpenAI GPT provider implementation
 */
export class OpenAIProvider implements ILLMProvider {
  readonly providerId: ProviderType = 'openai';
  readonly displayName = 'OpenAI GPT';

  private client: OpenAI | null = null;
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env[LLM_CONFIG.providers.openai.envKey];
  }

  /**
   * Lazily initialize the OpenAI client
   */
  private getClient(): OpenAI {
    if (!this.client) {
      if (!this.apiKey) {
        throw new Error(
          `OpenAI API key not found. Set ${LLM_CONFIG.providers.openai.envKey} environment variable.`,
        );
      }
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
    return this.client;
  }

  async createMessage(request: LLMRequest): Promise<LLMResponse> {
    const client = this.getClient();

    const openAIRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
      {
        model: request.model,
        max_completion_tokens: request.maxTokens,
        messages: toOpenAIMessages(request.messages, request.system),
        // Gpt-5 only supports temperature at 1 for now so will hardcode
        // can be update back to request.temperature when supported
        temperature: 1,
      };

    if (request.tools && request.tools.length > 0) {
      openAIRequest.tools = toOpenAITools(request.tools);
      openAIRequest.parallel_tool_calls = true;
    }

    const response = await client.chat.completions.create(openAIRequest);

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response choice from OpenAI');
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
      this.getClient();
      return true;
    } catch {
      return false;
    }
  }

  getDefaultModel(): string {
    return LLM_CONFIG.providers.openai.model;
  }
}
