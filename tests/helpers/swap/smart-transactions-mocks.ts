import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { getDecodedProxiedURL } from '../../smoke/notifications/utils/helpers';
import PortManager, { ResourceType } from '../../framework/PortManager';

const STX_UUID = '0d506aaa-5e38-4cab-ad09-2039cb7a0f33';

/**
 * /getFees response body.
 * The STX controller reads `txs[0].fees` to obtain gas fee parameters
 * for signing the swap transaction locally before submitting to the backend.
 */
const GET_FEES_RESPONSE = {
  txs: [
    {
      cancelFees: [],
      return: '0x',
      status: 1,
      gasUsed: 190780,
      gasLimit: 239420,
      fees: [
        {
          maxFeePerGas: 4667609171,
          maxPriorityFeePerGas: 1000000004,
          gas: 239420,
          balanceNeeded: 1217518987960240,
          currentBalance: 751982303082919400,
          error: '',
        },
      ],
      feeEstimate: 627603309182220,
      baseFeePerGas: 2289670348,
      maxFeeEstimate: 1117518987720820,
    },
  ],
};

/**
 * Sets up HTTP mocks that allow swap tests to execute with Smart Transactions enabled.
 *
 * ## How it works
 *
 * When Smart Transactions (STX) are enabled the publish hook intercepts every swap
 * transaction before it reaches the network:
 * 1. Calls `POST /getFees` → we return a static fee schedule.
 * 2. Signs the transaction locally using those fees.
 * 3. Calls `POST /submitTransactions` → we forward the raw signed tx to Anvil
 * via `eth_sendRawTransaction` so it actually gets mined, then return a UUID.
 * 4. Because `mobileReturnTxHashAsap: true` (set in the default remote feature-flag
 * mock), the hook immediately uses the locally-computed `txHash` without waiting
 * for `batchStatus` polling.
 * 5. TransactionController polls Anvil for `eth_getTransactionReceipt` using that
 * hash → Anvil returns a valid receipt → transaction is marked Confirmed.
 *
 * @param mockServer - The mockttp server instance.
 * @param anvilPort  - The port Anvil is listening on (defaults to DEFAULT_ANVIL_PORT).
 */
export async function setupSmartTransactionsMocks(
  mockServer: Mockttp,
  anvilPort: number,
): Promise<void> {
  // anvilPort is the fallback (DEFAULT_ANVIL_PORT = 8545).
  // On local dev the port manager allocates a random port, so we resolve
  // the actual port at request time to avoid ECONNREFUSED errors.
  const getActualAnvilRpcUrl = () => {
    const actualPort =
      PortManager.getInstance().getPort(ResourceType.ANVIL) ?? anvilPort;
    return `http://localhost:${actualPort}`;
  };

  // Mock POST /getFees – returns a single fee tier so createSignedTransactions
  // produces a non-empty rawTxs array that can be forwarded to Anvil.
  await setupMockRequest(mockServer, {
    url: /\.api\.cx\.metamask\.io\/(v\d+\/)?networks\/\d+\/getFees/,
    response: GET_FEES_RESPONSE,
    requestMethod: 'POST',
    responseCode: 200,
  });

  // Mock POST /submitTransactions – forward the signed transaction to Anvil so
  // eth_getTransactionReceipt resolves once the block is mined.
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return /\.api\.cx\.metamask\.io\/(v\d+\/)?networks\/\d+\/submitTransactions/.test(
        url,
      );
    })
    .asPriority(999)
    .thenCallback(async (request) => {
      let rawTxs: string[] = [];

      try {
        const bodyText = await request.body.getText();
        const body = JSON.parse(bodyText ?? '{}');
        rawTxs = body?.rawTxs ?? [];
      } catch {
        // Ignore JSON-parse errors – we still return a valid UUID below.
      }

      // Submit all signed transactions to Anvil so the locally-computed txHashes
      // are already on-chain when TransactionController polls for receipts.
      // When STX is enabled and a swap requires an approval, both the approval
      // tx and the swap tx are batched into a single submitTransactions call as
      // rawTxs = [approvalTx, swapTx]. We must forward both sequentially so
      // Anvil mines the approval before the swap (preserving nonce order).
      for (let i = 0; i < rawTxs.length; i++) {
        try {
          await fetch(getActualAnvilRpcUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_sendRawTransaction',
              params: [rawTxs[i]],
              id: i + 1,
            }),
          });
        } catch {
          // Non-fatal: the controller computes txHashes locally from rawTxs
          // regardless of whether this submission succeeds.
        }
      }

      return {
        statusCode: 200,
        json: { uuid: STX_UUID },
      };
    });

  // Mock GET /batchStatus – the STX controller polls this in the background
  // after submitTransactions. Mobile uses mobileReturnTxHashAsap: true so the
  // hook does not wait for this, but polling still runs in the background.
  // We always return SUCCESS so the background polling stops cleanly.
  const GET_BATCH_STATUS_SUCCESS = {
    [STX_UUID]: {
      cancellationFeeWei: 0,
      cancellationReason: 'not_cancelled',
      deadlineRatio: 0,
      isSettled: true,
      minedTx: 'success',
      wouldRevertMessage: null,
      minedHash:
        '0xec9d6214684d6dc191133ae4a7ec97db3e521fff9cfe5c4f48a84cb6c93a5fa5',
      timedOut: true,
      proxied: false,
      type: 'sentinel',
    },
  };

  await setupMockRequest(mockServer, {
    url: /\.api\.cx\.metamask\.io\/(v\d+\/)?networks\/\d+\/batchStatus/,
    response: GET_BATCH_STATUS_SUCCESS,
    requestMethod: 'GET',
    responseCode: 200,
  });

  // -- 7702 Relay mocks --
  // When a quote has gasIncluded7702: true the delegation-7702-publish hook
  // bypasses STX and submits through the Sentinel relay API instead.
  // We mock both the submit (JSON-RPC POST) and polling (GET) endpoints,
  // and send a simple tx to Anvil so TransactionController finds a receipt.

  const RELAY_UUID = 'relay-7702-e2e-uuid';
  let relayTxHash: string | undefined;

  // Mock POST eth_sendRelayTransaction – JSON-RPC to sentinel root URL.
  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      // Relay submit goes to the root sentinel URL (no path beyond /)
      return /tx-sentinel[^/]*\.api\.cx\.metamask\.io\/?$/.test(url);
    })
    .asPriority(1000)
    .thenCallback(async (request) => {
      let rpcId: unknown = 1;
      try {
        const bodyText = await request.body.getText();
        const body = JSON.parse(bodyText ?? '{}');
        rpcId = body?.id ?? 1;
      } catch {
        // Ignore parse errors
      }

      // Impersonate the test wallet and send a dummy tx to Anvil so a real
      // receipt exists when TransactionController polls eth_getTransactionReceipt.
      const walletAddress = '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3';
      try {
        const anvilUrl = getActualAnvilRpcUrl();

        await fetch(anvilUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'anvil_impersonateAccount',
            params: [walletAddress],
            id: 1,
          }),
        });

        const txResp = await fetch(anvilUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_sendTransaction',
            params: [{ from: walletAddress, to: walletAddress, value: '0x0' }],
            id: 2,
          }),
        });

        const txResult = await txResp.json();
        relayTxHash = txResult?.result;

        await fetch(anvilUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'anvil_stopImpersonatingAccount',
            params: [walletAddress],
            id: 3,
          }),
        });
      } catch {
        // Non-fatal: the relay UUID is still returned.
      }

      return {
        statusCode: 200,
        json: {
          jsonrpc: '2.0',
          result: { uuid: RELAY_UUID },
          id: rpcId,
        },
      };
    });

  // Mock GET /smart-transactions/{uuid} – relay polling endpoint.
  // waitForRelayResult polls this until status !== PENDING.
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return /tx-sentinel[^/]*\.api\.cx\.metamask\.io.*\/smart-transactions\//.test(
        url,
      );
    })
    .asPriority(1000)
    .thenCallback(() => ({
      statusCode: 200,
      json: {
        transactions: [
          {
            hash: relayTxHash,
            status: 'VALIDATED',
          },
        ],
      },
    }));

  // Mock GET /getTxStatus – fallback for same-chain swap tests.
  // Registered at priority 1 so bridge-mocks.ts (priority 999) always wins
  // for bridge tests, where src and dest tx hashes legitimately differ.
  // For same-chain swaps srcChainId == destChainId so reusing srcTxHash for
  // both chains is correct.
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes('getTxStatus');
    })
    .asPriority(1)
    .thenCallback((request) => {
      const decodedUrl = getDecodedProxiedURL(request.url);
      const urlObj = new URL(decodedUrl);
      const txHash = urlObj.searchParams.get('srcTxHash');
      const srcChainId = urlObj.searchParams.get('srcChainId');
      const destChainId = urlObj.searchParams.get('destChainId');

      return {
        statusCode: 200,
        json: {
          status: 'COMPLETE',
          isExpectedToken: true,
          bridge: 'across',
          srcChain: {
            chainId: Number(srcChainId),
            txHash,
          },
          destChain: {
            chainId: Number(destChainId),
            txHash,
          },
        },
      };
    });
}
