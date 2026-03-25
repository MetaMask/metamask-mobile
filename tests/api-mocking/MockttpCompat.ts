// tests/api-mocking/MockttpCompat.ts

/**
 * A minimal interface that replaces Mockttp (from the 'mockttp' package) in the
 * test infrastructure. Backed by HTTP calls to the Go mock server's control API.
 *
 * Static thenReply() / thenJson() rules are fully supported.
 * Dynamic thenCallback() rules are supported via a JavaScript callback bridge:
 * the Go proxy forwards unmatched requests to a Node.js HTTP server that runs
 * the registered JS predicates and handlers.
 *
 * Covered methods: forGet, forPost, forPut, forDelete, forHead, getMockedEndpoints.
 * Chained rule builder: .matching(pred) → .always() / .asPriority(n)
 * / .withJsonBodyIncluding(body) → .thenCallback(handler) / .thenJson(code, body)
 * / .thenReply(code, body, headers?)
 */

export type MockttpCallback = (request: {
  url: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  body: {
    getText(): Promise<string | undefined>;
    getJson<T = unknown>(): Promise<T>;
  };
}) =>
  | Promise<{
      statusCode: number;
      body?: string;
      json?: unknown;
      headers?: Record<string, string>;
    }>
  | {
      statusCode: number;
      body?: string;
      json?: unknown;
      headers?: Record<string, string>;
    };

export type MockttpPredicate = (request: {
  url: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  body: {
    getText(): Promise<string | undefined>;
    getJson<T = unknown>(): Promise<T>;
  };
}) => boolean | Promise<boolean>;

/**
 * The final chain level — returned by asPriority(), withJsonBodyIncluding(),
 * and also directly on the matching() result. Supports all three terminator methods.
 */
export interface MockttpCompatTerminalChain {
  thenCallback(handler: MockttpCallback): Promise<void>;
  thenJson(statusCode: number, body: object): Promise<void>;
  thenReply(
    statusCode: number,
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<void>;
}

export interface MockttpCompatMatchChain extends MockttpCompatTerminalChain {
  always(): MockttpCompatTerminalChain;
  withJsonBodyIncluding(
    body: Record<string, unknown>,
  ): MockttpCompatTerminalChain;
  /** Higher value = higher priority; higher-priority handlers are tried first. */
  asPriority(priority: number): MockttpCompatTerminalChain;
}

export interface MockttpCompatEndpoint {
  getSeenRequests(): Promise<
    {
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: { getJson<T = unknown>(): Promise<T> };
    }[]
  >;
  isPending?(): Promise<boolean>;
}

export interface MockttpCompatRule {
  thenReply(
    statusCode: number,
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<void>;
  thenJson(statusCode: number, body: object): Promise<void>;
  thenCallback(handler: MockttpCallback): Promise<void>;
  matching(predicate: MockttpPredicate): MockttpCompatMatchChain;
  /** Higher value = higher priority; higher-priority handlers are tried first. */
  asPriority(priority: number): MockttpCompatTerminalChain;
}

export interface MockttpCompat {
  forGet(url: string | RegExp): MockttpCompatRule;
  forPost(url: string | RegExp): MockttpCompatRule;
  forPut(url: string | RegExp): MockttpCompatRule;
  forDelete(url: string | RegExp): MockttpCompatRule;
  forHead(url: string | RegExp): MockttpCompatRule;
  forAnyRequest(): MockttpCompatRule;
  getMockedEndpoints(): Promise<MockttpCompatEndpoint[]>;
  stop?(): Promise<void>;
}
