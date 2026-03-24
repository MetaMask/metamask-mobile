// tests/api-mocking/MockttpCompat.ts

/**
 * A minimal interface that replaces Mockttp (from the 'mockttp' package) in the
 * test infrastructure. Backed by HTTP calls to the Go mock server's control API.
 *
 * Migration decision (2026-03-24): thenCallback() is used in ~80 places across
 * mock-response files. For the initial migration, only static thenReply() rules
 * are supported. Files using thenCallback() will be migrated in follow-up PRs
 * once the default mocks layer is stable on Go.
 *
 * Covered methods: forGet, forPost, forDelete, getMockedEndpoints.
 * NOT covered: forAnyRequest().thenCallback() — throws at runtime with clear message.
 */

export interface MockttpCompatRule {
  thenReply(status: number, body: unknown): Promise<void>;
}

export interface MockttpCompat {
  forGet(url: string | RegExp): MockttpCompatRule;
  forPost(url: string | RegExp): MockttpCompatRule;
  forDelete(url: string | RegExp): MockttpCompatRule;
  forAnyRequest(): { thenCallback: (cb: MockttpCallback) => Promise<void> };
  getMockedEndpoints(): Promise<unknown[]>;
}

export type MockttpCallback = (request: {
  url: string;
  method: string;
  body: { getText(): Promise<string | undefined> };
}) => Promise<{ statusCode: number; body: string }>;
