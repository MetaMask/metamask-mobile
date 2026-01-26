/**
 * Google Gemini Provider Implementation
 *
 * Wraps the @google/generative-ai SDK to implement the ILLMProvider interface.
 */

import {
  GoogleGenerativeAI,
  Content,
  Part,
  Tool,
  GenerateContentResult,
  FunctionCallingMode,
  SchemaType,
  FunctionDeclaration,
} from '@google/generative-ai';
import { ILLMProvider } from './llm-provider.ts';
import {
  ProviderType,
  LLMRequest,
  LLMResponse,
  LLMContentBlock,
  LLMMessage,
  LLMTool,
} from './types.ts';
import { LLM_CONFIG } from '../config.ts';

// Track function call IDs since Gemini doesn't provide them
let functionCallIdCounter = 0;

/**
 * Generate a unique function call ID that includes the function name
 * Format: {functionName}_{timestamp}_{counter}
 * This allows extracting the function name later for Google's functionResponse API
 */
function generateFunctionCallId(functionName: string): string {
  return `${functionName}_${Date.now()}_${++functionCallIdCounter}`;
}

/**
 * Extract function name from a generated function call ID
 * Handles IDs in format: {functionName}_{timestamp}_{counter}
 */
function extractFunctionName(toolUseId: string): string {
  // Split and take all parts except the last two (timestamp and counter)
  const parts = toolUseId.split('_');
  if (parts.length >= 3) {
    // Function name may contain underscores, so join all but last 2 parts
    return parts.slice(0, -2).join('_');
  }
  return toolUseId;
}

/**
 * Convert JSON Schema type to Gemini SchemaType
 */
function toGeminiSchemaType(type: string): SchemaType | undefined {
  switch (type) {
    case 'string':
      return SchemaType.STRING;
    case 'number':
      return SchemaType.NUMBER;
    case 'integer':
      return SchemaType.INTEGER;
    case 'boolean':
      return SchemaType.BOOLEAN;
    case 'array':
      return SchemaType.ARRAY;
    case 'object':
      return SchemaType.OBJECT;
    default:
      return undefined;
  }
}

/**
 * Gemini schema property interface (flexible to handle all schema variants)
 */
interface GeminiSchemaProperty {
  type?: SchemaType;
  description?: string;
  enum?: string[];
  items?: GeminiSchemaProperty;
  properties?: { [k: string]: GeminiSchemaProperty };
}

/**
 * Convert JSON Schema properties to Gemini format
 */
function convertSchemaProperties(properties: Record<string, unknown>): {
  [k: string]: GeminiSchemaProperty;
} {
  const result: { [k: string]: GeminiSchemaProperty } = {};

  for (const [key, value] of Object.entries(properties)) {
    const prop = value as Record<string, unknown>;
    const converted: GeminiSchemaProperty = {};

    if (prop.type) {
      converted.type = toGeminiSchemaType(prop.type as string);
    }
    if (prop.description) {
      converted.description = prop.description as string;
    }
    if (prop.enum) {
      converted.enum = prop.enum as string[];
    }
    if (prop.items) {
      converted.items = convertSchemaProperties({
        item: prop.items,
      }).item;
    }
    if (prop.properties) {
      converted.properties = convertSchemaProperties(
        prop.properties as Record<string, unknown>,
      );
    }

    result[key] = converted;
  }

  return result;
}

/**
 * Convert provider-agnostic tools to Google format
 */
function toGoogleTools(tools: LLMTool[]): Tool[] {
  const functionDeclarations = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties: tool.input_schema.properties
        ? convertSchemaProperties(tool.input_schema.properties)
        : {},
      required: tool.input_schema.required || [],
    },
  })) as FunctionDeclaration[];

  return [{ functionDeclarations }];
}

/**
 * Convert provider-agnostic messages to Google format
 */
function toGoogleContents(messages: LLMMessage[]): Content[] {
  const contents: Content[] = [];

  for (const msg of messages) {
    const parts: Part[] = [];

    if (typeof msg.content === 'string') {
      parts.push({ text: msg.content });
    } else {
      for (const block of msg.content) {
        if (block.type === 'text') {
          parts.push({ text: block.text });
        } else if (block.type === 'tool_use') {
          parts.push({
            functionCall: {
              name: block.name,
              args: block.input,
            },
          });
        } else if (block.type === 'tool_result') {
          parts.push({
            functionResponse: {
              name: extractFunctionName(block.tool_use_id),
              response: { result: block.content },
            },
          });
        }
      }
    }

    if (parts.length > 0) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }
  }

  return contents;
}

/**
 * Convert Google response to provider-agnostic format
 */
function fromGoogleResponse(result: GenerateContentResult): LLMContentBlock[] {
  const content: LLMContentBlock[] = [];
  const response = result.response;
  const candidates = response.candidates;

  if (!candidates || candidates.length === 0) {
    return content;
  }

  const candidate = candidates[0];
  const parts = candidate.content?.parts || [];

  for (const part of parts) {
    if ('text' in part && part.text) {
      content.push({
        type: 'text',
        text: part.text,
      });
    } else if ('functionCall' in part && part.functionCall) {
      const functionName = part.functionCall.name;
      content.push({
        type: 'tool_use',
        id: generateFunctionCallId(functionName),
        name: functionName,
        input: (part.functionCall.args as Record<string, unknown>) || {},
      });
    }
  }

  return content;
}

/**
 * Map Google finish reason to standardized stop reason
 */
function mapFinishReason(result: GenerateContentResult): string {
  const response = result.response;
  const candidates = response.candidates;

  if (!candidates || candidates.length === 0) {
    return 'end_turn';
  }

  const finishReason = candidates[0].finishReason;

  switch (finishReason) {
    case 'STOP':
      return 'end_turn';
    case 'MAX_TOKENS':
      return 'max_tokens';
    case 'SAFETY':
      return 'content_filter';
    case 'RECITATION':
      return 'content_filter';
    default:
      return 'end_turn';
  }
}

/**
 * Google Gemini provider implementation
 */
export class GoogleProvider implements ILLMProvider {
  readonly providerId: ProviderType = 'google';
  readonly displayName = 'Google Gemini';

  private client: GoogleGenerativeAI | null = null;
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env[LLM_CONFIG.providers.google.envKey];
  }

  /**
   * Lazily initialize the Google client
   */
  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      if (!this.apiKey) {
        throw new Error(
          `Gemini API key not found. Set ${LLM_CONFIG.providers.google.envKey} environment variable.`,
        );
      }
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
    return this.client;
  }

  async createMessage(request: LLMRequest): Promise<LLMResponse> {
    const client = this.getClient();

    const model = client.getGenerativeModel({
      model: request.model,
      generationConfig: {
        maxOutputTokens: request.maxTokens,
        temperature: request.temperature,
      },
      tools: request.tools ? toGoogleTools(request.tools) : undefined,
      toolConfig:
        request.tools && request.tools.length > 0
          ? { functionCallingConfig: { mode: FunctionCallingMode.AUTO } }
          : undefined,
      systemInstruction: request.system,
    });

    const contents = toGoogleContents(request.messages);
    const result = await model.generateContent({ contents });

    return {
      content: fromGoogleResponse(result),
      model: request.model,
      stopReason: mapFinishReason(result),
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const client = this.getClient();
      // Make a minimal API call to verify the service is available
      const model = client.getGenerativeModel({
        model: this.getDefaultModel(),
        generationConfig: { maxOutputTokens: 1 },
      });
      await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultModel(): string {
    return LLM_CONFIG.providers.google.model;
  }
}
