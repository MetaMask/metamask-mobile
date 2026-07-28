import {
  createOpenAIResponsesSSEParser,
  OpenAIResponsesStreamError,
  streamOpenAIResponse,
} from './responsesStreaming';

describe('createOpenAIResponsesSSEParser', () => {
  it('accumulates text deltas and extracts the final response', () => {
    const onTextDelta = jest.fn();
    const parser = createOpenAIResponsesSSEParser({ onTextDelta });

    parser.push(
      'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"Hel"}\n\n',
    );
    parser.push('data: {"type":"response.output_text.delta","delta":"lo"}\n\n');
    parser.push(
      'data: {"type":"response.completed","response":{"id":"resp_1","status":"completed"}}\n\n',
    );

    expect(parser.finish()).toEqual({
      response: { id: 'resp_1', status: 'completed' },
      text: 'Hello',
    });
    expect(onTextDelta).toHaveBeenNthCalledWith(1, 'Hel', 'Hel');
    expect(onTextDelta).toHaveBeenNthCalledWith(2, 'lo', 'Hello');
  });

  it('handles CRLF and arbitrary chunk boundaries', () => {
    const parser = createOpenAIResponsesSSEParser();
    const stream =
      'event: response.output_text.delta\r\ndata: {"delta":"A"}\r\n\r\n' +
      'data: {"type":"response.output_text.delta","delta":"B"}\r\n\r\n' +
      'data: [DONE]\r\n\r\n';

    for (const chunk of [
      stream.slice(0, 4),
      stream.slice(4, 31),
      stream.slice(31, 55),
      stream.slice(55, 83),
      stream.slice(83),
    ]) {
      parser.push(chunk);
    }

    expect(parser.finish()).toEqual({ response: undefined, text: 'AB' });
  });

  it('joins multi-line data fields and ignores comments', () => {
    const parser = createOpenAIResponsesSSEParser();

    parser.push(
      ': keep-alive\n' +
        'event: response.output_text.delta\n' +
        'data: {"type":"response.output_text.delta",\n' +
        'data: "delta":"joined"}\n\n',
    );

    expect(parser.finish().text).toBe('joined');
  });

  it('stops processing after the done sentinel', () => {
    const parser = createOpenAIResponsesSSEParser();

    parser.push(
      'data: {"type":"response.output_text.delta","delta":"kept"}\n\n' +
        'data: [DONE]\n\n' +
        'data: {"type":"response.output_text.delta","delta":"ignored"}\n\n',
    );

    expect(parser.finish().text).toBe('kept');
  });

  it.each(['error', 'response.failed'])(
    'throws a useful error for %s events',
    (type) => {
      const parser = createOpenAIResponsesSSEParser();

      expect(() =>
        parser.push(
          `data: {"type":"${type}","error":{"message":"request failed"}}\n\n`,
        ),
      ).toThrow(
        expect.objectContaining({
          message: 'request failed',
          name: 'OpenAIResponsesStreamError',
        }),
      );
    },
  );

  it('rejects malformed event JSON', () => {
    const parser = createOpenAIResponsesSSEParser();

    expect(() => parser.push('data: {not-json}\n\n')).toThrow(
      OpenAIResponsesStreamError,
    );
  });
});

describe('streamOpenAIResponse', () => {
  it('streams deltas, forces streaming, and forwards the abort signal', async () => {
    const signal = new AbortController().signal;
    const onTextDelta = jest.fn();
    const fetchImplementation = jest.fn().mockResolvedValue(
      new Response(
        'data: {"type":"response.output_text.delta","delta":"Hi"}\n\n' +
          'data: {"type":"response.completed","response":{"id":"resp_2"}}\n\n',
        {
          headers: { 'Content-Type': 'text/event-stream' },
          status: 200,
        },
      ),
    );

    const result = await streamOpenAIResponse({
      apiKey: 'test-key',
      body: { model: 'test-model', stream: false },
      fetchImplementation,
      onTextDelta,
      signal,
    });

    expect(result).toEqual({ response: { id: 'resp_2' }, text: 'Hi' });
    expect(onTextDelta).toHaveBeenCalledWith('Hi', 'Hi');
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        body: JSON.stringify({ model: 'test-model', stream: true }),
        signal,
      }),
    );
  });

  it('surfaces non-success HTTP responses', async () => {
    const fetchImplementation = jest
      .fn()
      .mockResolvedValue(new Response('rate limited', { status: 429 }));

    await expect(
      streamOpenAIResponse({
        apiKey: 'test-key',
        body: {},
        fetchImplementation,
      }),
    ).rejects.toMatchObject({
      message: 'The AI request failed (429).',
      status: 429,
    });
  });

  it('propagates caller abort errors', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    const fetchImplementation = jest.fn().mockRejectedValue(abortError);

    await expect(
      streamOpenAIResponse({
        apiKey: 'test-key',
        body: {},
        fetchImplementation,
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
