/**
 * HTTP mocks for the VBA transfers (deposit history) component view tests.
 *
 * Money Account API (TRAM-4375), as called by the real
 * `MoneyAccountApiDataService` from `@metamask/money-account-api-data-service`:
 * - POST /v1/vba/auth/challenge → SIWE challenge for the wallet
 * - POST /v1/vba/auth/verify    → SIWE session token
 * - GET  /v1/vba/transfers      → current transfers (Bearer SIWE token)
 *
 * Accounts API, as called by `useMoneyAccountApiActivity`:
 * - GET /v1/accounts/:address/transactions (cursor-paged)
 *
 * Jest runs without `MM_API_ENV`, so `getApiEnv()` is Prod and the service
 * talks to the production Money Account API host.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import type {
  VbaSiweChallengeResponse,
  VbaSiweSessionResponse,
  VbaTransfer,
  VbaTransfersResponse,
} from '@metamask/money-account-api-data-service';
import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

export const MONEY_API_ORIGIN = 'https://money.api.cx.metamask.io';
const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const V1_ACCOUNT_TRANSACTIONS_PATH = /\/v1\/accounts\/[^/]+\/transactions$/;

export const VBA_SIWE_TOKEN = 'vba-siwe-session-token';
const SIWE_NONCE = 'a'.repeat(64);

/**
 * Builds the challenge message exactly as the Money Account API does. The
 * service rebuilds it from its own template and rejects any difference, so
 * this mirrors `buildSiweMessage` in the package (not exported) with the
 * package's pinned statement, chain id (Monad, 143) and 5-minute TTL.
 *
 * @param address - Address from the challenge request body.
 * @param issuedAtMs - Issue time.
 * @returns The SIWE message.
 */
const buildChallengeMessage = (address: string, issuedAtMs: number) => {
  const { host, origin } = new URL(MONEY_API_ORIGIN);
  return [
    `${host} wants you to sign in with your Ethereum account:`,
    address.toLowerCase(),
    '',
    'Sign in to view your VBA transfers.',
    '',
    `URI: ${origin}`,
    'Version: 1',
    'Chain ID: 143',
    `Nonce: ${SIWE_NONCE}`,
    `Issued At: ${new Date(issuedAtMs).toISOString()}`,
    `Expiration Time: ${new Date(issuedAtMs + 300_000).toISOString()}`,
  ].join('\n');
};

export interface VbaHttpCalls {
  challenge: { address: string }[];
  verify: { message: string; signature: string }[];
  transfers: { authorization: string | undefined }[];
  accountPages: (string | undefined)[];
  /** Cursors whose Accounts API response body nock has fully sent. */
  accountPagesReplied: (string | undefined)[];
}

export const createVbaHttpCalls = (): VbaHttpCalls => ({
  challenge: [],
  verify: [],
  transfers: [],
  accountPages: [],
  accountPagesReplied: [],
});

export type VbaTransfersReply =
  | { status: 200; body: VbaTransfersResponse }
  | { status: 401 | 403 | 500 | 503; body: { message: string } };

/**
 * Installs the SIWE exchange and the transfers endpoint. `replies` are used in
 * order for successive transfers requests; the last one repeats.
 *
 * @param calls - Recorder for request details.
 * @param replies - Transfers replies in order.
 */
export function setupVbaTransfersApiMock(
  calls: VbaHttpCalls,
  replies: VbaTransfersReply[],
): void {
  nock(MONEY_API_ORIGIN)
    .persist()
    .post('/v1/vba/auth/challenge')
    .reply(200, (_uri, body) => {
      const { address } = body as { address: string };
      calls.challenge.push({ address });
      const challenge: VbaSiweChallengeResponse = {
        nonce: SIWE_NONCE,
        message: buildChallengeMessage(address, Date.now()),
      };
      return challenge;
    });

  nock(MONEY_API_ORIGIN)
    .persist()
    .post('/v1/vba/auth/verify')
    .reply(200, (_uri, body) => {
      calls.verify.push(body as { message: string; signature: string });
      const session: VbaSiweSessionResponse = {
        token_type: 'bearer',
        access_token: VBA_SIWE_TOKEN,
        expires_in: 900,
      };
      return session;
    });

  nock(MONEY_API_ORIGIN)
    .persist()
    .get('/v1/vba/transfers')
    .reply(function reply() {
      const index = Math.min(calls.transfers.length, replies.length - 1);
      calls.transfers.push({
        authorization: this.req.headers.authorization as string | undefined,
      });
      const { status, body } = replies[index];
      return [status, body];
    });
}

export interface AccountPage {
  response: V1AccountTransactionsResponse;
  /** Resolve to release this page; omit to reply at once. */
  hold?: Promise<void>;
}

/**
 * Installs the Accounts API transactions endpoint. The first request (no
 * cursor) gets `pages.first`; a request with `cursor` gets `pages[cursor]`.
 *
 * @param calls - Recorder for the requested cursors.
 * @param pages - Pages keyed by cursor (`first` for the initial request).
 */
export function setupAccountTransactionsApiMock(
  calls: VbaHttpCalls,
  pages: Record<string, AccountPage>,
): void {
  const cursorOf = (path: string) =>
    new URL(path, ACCOUNTS_API_ORIGIN).searchParams.get('cursor') ?? undefined;
  const scope = nock(ACCOUNTS_API_ORIGIN);
  // A held page released at the end of a test must finish replying before
  // teardown; otherwise nock answers it during the next test and that test
  // fails with "the request has already been handled". Tests that release a
  // page wait on this list.
  scope.on('replied', (req: { path: string }) => {
    calls.accountPagesReplied.push(cursorOf(req.path));
  });
  scope
    .persist()
    .get(V1_ACCOUNT_TRANSACTIONS_PATH)
    .query(true)
    .reply((uri, _body, callback) => {
      const cursor = cursorOf(uri);
      calls.accountPages.push(cursor);
      const page = pages[cursor ?? 'first'];
      const send = () => callback(null, [200, page.response]);
      if (page.hold) {
        page.hold.then(send);
      } else {
        send();
      }
    });
}

export const EMPTY_ACCOUNT_PAGE: V1AccountTransactionsResponse = {
  data: [],
  pageInfo: { count: 0, hasNextPage: false },
};

export function startVbaTransfersNock(): void {
  clearAllNockMocks();
  disableNetConnect();
}

export function teardownVbaTransfersNock(): void {
  teardownNock();
}

export type { VbaTransfer };
