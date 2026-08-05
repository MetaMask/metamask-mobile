import type { Mockttp } from 'mockttp';
import { DEFAULT_FIXTURE_ACCOUNT } from '../../../framework/fixtures/FixtureBuilder.js';
import {
  chainIdForRpcUrl,
  toWeiHex,
  type TokenHolding,
} from '../../../framework/fixtures/mmpay-token-holdings-registry.js';

const BALANCE_OF_SELECTOR = '0x70a08231';
const AGGREGATE3_SELECTOR = '0x82ad56cb';
const MULTICALL3_ADDRESS = '0xca11bde05977b3631167028862be2a173976ca11';

interface EthCallArg {
  to?: string;
  data?: string;
}

interface RpcCall {
  id?: number | string;
  method?: string;
  params?: (string | EthCallArg)[];
}

/**
 * Builds balance objects matching the Accounts API schema from the provided holdings.
 */
function buildAccountsApiBalances(
  holdings: TokenHolding[],
  defaultAccount: string,
  options: { includeAccountAddress: boolean },
) {
  return holdings.map((holding) => {
    const decimalChainId = parseInt(holding.chainId, 16);
    let balance = holding.amount;

    if (!balance.includes('.')) {
      balance = `${balance}.${'0'.repeat(holding.decimals)}`;
    } else {
      const parts = balance.split('.');
      const intPart = parts[0] as string;
      const fracPart = parts[1] as string;
      if (fracPart.length > holding.decimals) {
        balance = `${intPart}.${fracPart.substring(0, holding.decimals)}`;
      } else {
        balance = `${intPart}.${fracPart.padEnd(holding.decimals, '0')}`;
      }
    }

    return {
      object: 'token',
      address: holding.isNative
        ? '0x0000000000000000000000000000000000000000'
        : holding.address,
      symbol: holding.symbol,
      name: holding.symbol,
      type: holding.isNative ? 'native' : 'erc20',
      decimals: holding.decimals,
      chainId: decimalChainId,
      balance,
      ...(options.includeAccountAddress && {
        accountAddress: `eip155:${decimalChainId}:${
          holding.account ?? defaultAccount
        }`,
      }),
    };
  });
}

/**
 * Registers on-chain balance mocks (eth_call balanceOf and eth_getBalance) for
 * the given holdings, so MM Pay's live balance reads resolve for any token the
 * user may select. Pair with FixtureBuilder.withTokenHoldings using the same
 * holdings so fixture state and RPC responses stay consistent.
 *
 * @param mockServer - The Mockttp server to register handlers on.
 * @param holdings - Tokens seeded onto the account.
 * @param defaultAccount - Account used when a holding omits `account`.
 */
export async function applyTokenHoldingsMocks(
  mockServer: Mockttp,
  holdings: TokenHolding[],
  defaultAccount: string = DEFAULT_FIXTURE_ACCOUNT,
) {
  const v4BalancesResponse = () => ({
    statusCode: 200,
    json: {
      balances: buildAccountsApiBalances(holdings, defaultAccount, {
        includeAccountAddress: true,
      }),
      unprocessedNetworks: [],
    },
  });

  // Broad `/balances` match (not strict version path) survives Accounts API
  // version drift. Priority 1005 overrides PERPS_ARBITRUM_MOCKS' empty
  // catch-all (1000) without modifying it.
  await mockServer
    .forGet(/accounts\.api\.cx\.metamask\.io\/.*\/balances/)
    .asPriority(1005)
    .thenCallback(v4BalancesResponse);

  // Proxied variant: shim wraps targets as `/proxy?url=<encoded>`, so decode the
  // `url` param (target slashes are %2F-encoded and won't match request.url).
  await mockServer
    .forGet('/proxy')
    .asPriority(1005)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return Boolean(
        url.includes('accounts.api.cx.metamask.io') &&
          url.includes('/balances'),
      );
    })
    .thenCallback(v4BalancesResponse);

  const account = defaultAccount.toLowerCase();

  const addressParam = (rpc: RpcCall): string | undefined => {
    const arg = rpc?.params?.[0];
    return typeof arg === 'string' ? arg.toLowerCase() : undefined;
  };

  const callArg = (rpc: RpcCall): EthCallArg | undefined => {
    const arg = rpc?.params?.[0];
    return arg && typeof arg === 'object' ? arg : undefined;
  };

  const isOurBalanceCall = (rpc: RpcCall): boolean => {
    if (rpc?.method === 'eth_getBalance') {
      return addressParam(rpc) === account;
    }
    if (rpc?.method === 'eth_call') {
      const data = callArg(rpc)?.data?.toLowerCase();
      return Boolean(
        data?.startsWith(BALANCE_OF_SELECTOR) &&
          data.includes(account.slice(2)),
      );
    }
    return false;
  };

  // Resolves a single JSON-RPC balance read to the seeded value, defaulting to
  // zero. Zero is intentional: AssetsController RPC-polls every configured chain
  // (single AND batched) and writes results into unified assetsBalance, which
  // the MM Pay picker reads. Returning 0x0 for unseeded chains stops the deposit
  // account inheriting PERPS_ARBITRUM_MOCKS' phantom 100 ETH / 200 USDC.
  const resolveBalance = (rpc: RpcCall, chainId: string): string => {
    if (rpc?.method === 'eth_getBalance') {
      const native = holdings.find((h) => h.isNative && h.chainId === chainId);
      return native ? toWeiHex(native.amount, native.decimals) : '0x0';
    }
    if (rpc?.method === 'eth_call') {
      const to = callArg(rpc)?.to?.toLowerCase();
      const token = holdings.find(
        (h) =>
          !h.isNative &&
          h.chainId === chainId &&
          h.address.toLowerCase() === to,
      );
      const raw = token ? toWeiHex(token.amount, token.decimals).slice(2) : '0';
      return `0x${raw.padStart(64, '0')}`;
    }
    return '0x0';
  };

  const isAggregate3Call = (rpc: RpcCall): boolean =>
    rpc?.method === 'eth_call' &&
    callArg(rpc)?.to?.toLowerCase() === MULTICALL3_ADDRESS &&
    Boolean(callArg(rpc)?.data?.toLowerCase().startsWith(AGGREGATE3_SELECTOR));

  // Force AssetsController's Multicall3 aggregate3 path to fall back to
  // individual balance calls (which the 1002 handler below serves). Ethers v5
  // decodes a JSON-RPC `result: '0x'` into a CALL_EXCEPTION, the only error the
  // fetcher (multicall.cjs) catches to trigger per-call fallback; any other
  // error (or HTTP 500) is re-thrown and would zero out ALL balances. Registered
  // above the balance handler so aggregate3 never reaches the shared mock.
  await mockServer
    .forPost('/proxy')
    .asPriority(1003)
    .matching(async (request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      if (!chainIdForRpcUrl(url)) return false;
      try {
        const body = JSON.parse((await request.body.getText()) || '{}');
        const calls: RpcCall[] = Array.isArray(body) ? body : [body];
        return calls.some(isAggregate3Call);
      } catch {
        return false;
      }
    })
    .thenCallback(async (request) => {
      const body = JSON.parse((await request.body.getText()) || '{}');
      if (Array.isArray(body)) {
        return {
          statusCode: 200,
          json: body.map((rpc: RpcCall) => ({
            jsonrpc: '2.0',
            id: rpc?.id ?? 1,
            result: '0x',
          })),
        };
      }
      return {
        statusCode: 200,
        json: { jsonrpc: '2.0', id: body?.id ?? 1, result: '0x' },
      };
    });

  await mockServer
    .forPost('/proxy')
    .asPriority(1002)
    .matching(async (request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      const chainId = chainIdForRpcUrl(url);
      if (!chainId) return false;

      try {
        const body = JSON.parse((await request.body.getText()) || '{}');
        const calls: RpcCall[] = Array.isArray(body) ? body : [body];
        return calls.some((rpc) => isOurBalanceCall(rpc));
      } catch {
        return false;
      }
    })
    .thenCallback(async (request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      const chainId = chainIdForRpcUrl(url) as string;
      const body = JSON.parse((await request.body.getText()) || '{}');

      if (Array.isArray(body)) {
        const results = body.map((rpc: RpcCall) => ({
          jsonrpc: '2.0',
          id: rpc?.id ?? 1,
          result: isOurBalanceCall(rpc) ? resolveBalance(rpc, chainId) : '0x0',
        }));
        return { statusCode: 200, json: results };
      }

      return {
        statusCode: 200,
        json: {
          jsonrpc: '2.0',
          id: body?.id ?? 1,
          result: resolveBalance(body, chainId),
        },
      };
    });
}
