import {
  REDUNDANT_WINDOW_MS,
  createRedundancyTracker,
  fingerprintRequest,
  getEndpointLabel,
  getRpcMethod,
  normalizePath,
  scrubOutgoingRequestSpan,
} from './networkSpanAttributes';

describe('normalizePath', () => {
  it('collapses ids, hashes, addresses and long tokens but keeps versions and short numbers', () => {
    expect(normalizePath('/v3/00000000000000000000000000000000')).toBe(
      '/v3/:id',
    );
    expect(
      normalizePath('/v1/profiles/eacffcc1-b6d5-4905-8f72-0a1b2c3d4e5f'),
    ).toBe('/v1/profiles/:id');
    expect(
      normalizePath('/users/0xa14f0971474281db04367be2ab9b6a8a5a9d3a21'),
    ).toBe('/users/:address');
    expect(normalizePath('/v1/lending/1/markets')).toBe(
      '/v1/lending/1/markets',
    );
    expect(normalizePath('/orders/123456')).toBe('/orders/:n');
  });
});

describe('getEndpointLabel', () => {
  it('drops scheme, query and fragment so no address or key can leak through it', () => {
    expect(
      getEndpointLabel(
        'get',
        'https://nft.api.cx.metamask.io/users/0xa14f0971474281db04367be2ab9b6a8a5a9d3a21/tokens?chainIds=1&account=0xabc#top',
      ),
    ).toBe('GET nft.api.cx.metamask.io/users/:address/tokens');
  });

  it('hides an Infura style key in the path', () => {
    expect(
      getEndpointLabel(
        'POST',
        'https://mainnet.infura.io/v3/0123456789abcdef0123456789abcdef',
      ),
    ).toBe('POST mainnet.infura.io/v3/:id');
  });

  it('falls back to the method for an unparseable url instead of echoing it', () => {
    expect(getEndpointLabel('GET', 'not a url ?secret=1')).toBe('GET');
  });
});

describe('getRpcMethod', () => {
  it('reads a single JSON-RPC method from a string body', () => {
    expect(
      getRpcMethod('{"jsonrpc":"2.0","method":"eth_call","params":[]}'),
    ).toBe('eth_call');
  });

  it('labels a batch by size and ignores bodies that are not JSON-RPC', () => {
    expect(getRpcMethod('[{"method":"a"},{"method":"b"}]')).toBe('batch(2)');
    expect(getRpcMethod('{"query":"x"}')).toBeUndefined();
    expect(getRpcMethod('not json')).toBeUndefined();
    expect(getRpcMethod(undefined)).toBeUndefined();
    expect(getRpcMethod(new Uint8Array([1, 2]))).toBeUndefined();
  });

  it('never parses a huge body', () => {
    const huge = `{"method":"eth_call","pad":"${'x'.repeat(200_000)}"}`;
    expect(getRpcMethod(huge)).toBeUndefined();
  });
});

describe('createRedundancyTracker', () => {
  it('flags the same request repeated inside the window, not the first one or a later one', () => {
    const isRedundant = createRedundancyTracker();
    expect(isRedundant('a', 1000)).toBe(false);
    expect(isRedundant('a', 1000 + REDUNDANT_WINDOW_MS - 1)).toBe(true);
    expect(isRedundant('a', 1000 + REDUNDANT_WINDOW_MS * 3)).toBe(false);
    expect(isRedundant('b', 1100)).toBe(false);
  });

  it('stays bounded under many distinct requests', () => {
    const isRedundant = createRedundancyTracker({ maxEntries: 50 });
    for (let index = 0; index < 500; index += 1) {
      isRedundant(`k${index}`, index);
    }
    expect(isRedundant('k499', 500)).toBe(true);
    expect(isRedundant('k0', 501)).toBe(false);
  });
});

describe('fingerprintRequest', () => {
  it('is stable, distinguishes bodies, and never contains the raw url or body', () => {
    const a = fingerprintRequest(
      'POST',
      'https://x.io/rpc?k=secret',
      '{"id":1}',
    );
    expect(a).toBe(
      fingerprintRequest('POST', 'https://x.io/rpc?k=secret', '{"id":1}'),
    );
    expect(a).not.toBe(
      fingerprintRequest('POST', 'https://x.io/rpc?k=secret', '{"id":2}'),
    );
    expect(a).not.toContain('secret');
  });
});

describe('scrubOutgoingRequestSpan', () => {
  it('rewrites an http.client span so no raw url, query or key is sent', () => {
    const scrubbed = scrubOutgoingRequestSpan({
      op: 'http.client',
      description:
        'GET https://nft.api.cx.metamask.io/users/0xa14f0971474281db04367be2ab9b6a8a5a9d3a21',
      data: {
        url: 'https://nft.api.cx.metamask.io/users/0xa14f0971474281db04367be2ab9b6a8a5a9d3a21?account=0xabc',
        'http.url':
          'https://nft.api.cx.metamask.io/users/0xa14f0971474281db04367be2ab9b6a8a5a9d3a21?account=0xabc',
        'url.full':
          'https://nft.api.cx.metamask.io/users/0xa14f0971474281db04367be2ab9b6a8a5a9d3a21?account=0xabc',
        'http.query': '?account=0xabc',
        'http.fragment': '#x',
        'http.method': 'GET',
        'server.address': 'nft.api.cx.metamask.io',
        'http.response.status_code': 200,
      },
    });

    expect(scrubbed.description).toBe(
      'GET nft.api.cx.metamask.io/users/:address',
    );
    expect(scrubbed.data).toEqual({
      url: 'https://nft.api.cx.metamask.io/users/:address',
      'http.url': 'https://nft.api.cx.metamask.io/users/:address',
      'url.full': 'https://nft.api.cx.metamask.io/users/:address',
      'http.method': 'GET',
      'server.address': 'nft.api.cx.metamask.io',
      'http.response.status_code': 200,
    });
    expect(JSON.stringify(scrubbed)).not.toContain('0xa14f');
    expect(JSON.stringify(scrubbed)).not.toContain('account=');
  });

  it('leaves spans that are not outgoing requests untouched', () => {
    const span = { op: 'ui.load', description: 'Home', data: { a: 1 } };
    expect(scrubOutgoingRequestSpan(span)).toBe(span);
  });

  it('does not throw on a malformed span', () => {
    expect(() => scrubOutgoingRequestSpan({ op: 'http.client' })).not.toThrow();
  });
});
