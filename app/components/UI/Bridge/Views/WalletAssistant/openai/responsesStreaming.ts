export type OpenAIResponsePayload = Record<string, unknown>;

export interface OpenAIResponsesStreamResult {
  response?: OpenAIResponsePayload;
  text: string;
}

export interface OpenAIResponsesStreamCallbacks {
  onEvent?: (event: OpenAIResponsePayload) => void;
  onTextDelta?: (delta: string, accumulatedText: string) => void;
}

export interface StreamOpenAIResponseOptions
  extends OpenAIResponsesStreamCallbacks {
  apiKey: string;
  body: Record<string, unknown>;
  fetchImplementation?: typeof fetch;
  signal?: AbortSignal;
  url?: string;
}

interface ParsedSSEEvent {
  data: string;
  event?: string;
}

const RESPONSES_API_URL = 'https://api.openai.com/v1/responses';

const getErrorMessage = (payload: OpenAIResponsePayload) => {
  const error = payload.error;

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  const response = payload.response;
  if (response && typeof response === 'object') {
    const responseError = (response as Record<string, unknown>).error;
    if (responseError && typeof responseError === 'object') {
      const message = (responseError as Record<string, unknown>).message;
      if (typeof message === 'string') {
        return message;
      }
    }
  }

  return 'The AI response stream failed.';
};

export class OpenAIResponsesStreamError extends Error {
  readonly payload?: OpenAIResponsePayload;
  readonly status?: number;

  constructor(
    message: string,
    payload?: OpenAIResponsePayload,
    status?: number,
  ) {
    super(message);
    this.name = 'OpenAIResponsesStreamError';
    this.payload = payload;
    this.status = status;
  }
}

const parseSSEEvent = (block: string): ParsedSSEEvent | undefined => {
  const data: string[] = [];
  let event: string | undefined;

  for (const line of block.split(/\r\n|\n|\r/)) {
    if (!line || line.startsWith(':')) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    let value = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1);

    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    if (field === 'data') {
      data.push(value);
    } else if (field === 'event') {
      event = value;
    }
  }

  if (!data.length) {
    return undefined;
  }

  return { data: data.join('\n'), event };
};

/**
 * Incrementally parses OpenAI Responses API server-sent events. The parser
 * retains only the incomplete SSE frame and the response text accumulated for
 * the current request.
 */
export const createOpenAIResponsesSSEParser = (
  callbacks: OpenAIResponsesStreamCallbacks = {},
) => {
  let buffer = '';
  let response: OpenAIResponsePayload | undefined;
  let text = '';
  let done = false;

  const consumeBlock = (block: string) => {
    const parsedEvent = parseSSEEvent(block);
    if (!parsedEvent || parsedEvent.data === '[DONE]') {
      done ||= parsedEvent?.data === '[DONE]';
      return;
    }

    let payload: OpenAIResponsePayload;
    try {
      payload = JSON.parse(parsedEvent.data) as OpenAIResponsePayload;
    } catch {
      throw new OpenAIResponsesStreamError(
        'The AI response stream contained invalid JSON.',
      );
    }

    callbacks.onEvent?.(payload);

    const type =
      typeof payload.type === 'string' ? payload.type : parsedEvent.event;

    if (type === 'response.output_text.delta') {
      const delta = payload.delta;
      if (typeof delta === 'string') {
        text += delta;
        callbacks.onTextDelta?.(delta, text);
      }
    } else if (type === 'response.completed') {
      if (payload.response && typeof payload.response === 'object') {
        response = payload.response as OpenAIResponsePayload;
      } else {
        response = payload;
      }
    } else if (type === 'error' || type === 'response.failed') {
      throw new OpenAIResponsesStreamError(getErrorMessage(payload), payload);
    }
  };

  const consumeAvailableBlocks = () => {
    while (true) {
      if (done) {
        break;
      }
      const match = /(?:\r\n\r\n|\n\n|\r\r)/.exec(buffer);
      if (!match || match.index === undefined) {
        break;
      }

      const block = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      consumeBlock(block);
    }
  };

  return {
    finish: (): OpenAIResponsesStreamResult => {
      if (!done && buffer.trim()) {
        consumeBlock(buffer);
      }
      buffer = '';
      return { response, text };
    },
    push: (chunk: string) => {
      if (done || !chunk) {
        return;
      }
      buffer += chunk;
      consumeAvailableBlocks();
    },
  };
};

const consumeResponseBody = async (
  response: Response,
  push: (chunk: string) => void,
) => {
  if (!response.body) {
    push(await response.text());
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        push(decoder.decode());
        break;
      }
      push(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }
};

/**
 * Streams one OpenAI Responses request. The API key is used only to construct
 * this request and is not retained by the returned result or parser state.
 */
export const streamOpenAIResponse = async ({
  apiKey,
  body,
  fetchImplementation = fetch,
  onEvent,
  onTextDelta,
  signal,
  url = RESPONSES_API_URL,
}: StreamOpenAIResponseOptions): Promise<OpenAIResponsesStreamResult> => {
  const response = await fetchImplementation(url, {
    body: JSON.stringify({ ...body, stream: true }),
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw new OpenAIResponsesStreamError(
      `The AI request failed (${response.status}).`,
      undefined,
      response.status,
    );
  }

  const parser = createOpenAIResponsesSSEParser({ onEvent, onTextDelta });
  await consumeResponseBody(response, parser.push);
  return parser.finish();
};
