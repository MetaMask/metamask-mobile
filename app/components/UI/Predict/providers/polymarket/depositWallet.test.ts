import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { query } from '@metamask/controller-utils';
import type { Signer } from '../types';
import {
  DEPOSIT_WALLET_FACTORY_ADDRESS,
  deriveDepositWalletBeaconAddress,
  deriveDepositWalletAddress,
  deriveDepositWalletUupsAddress,
  executeDepositWalletBatch,
  executeDepositWalletBatchAndWaitForCompletion,
  getDepositWalletNonce,
  readDepositWalletFactoryBeacon,
  requestDepositWalletCreate,
  resolveDepositWalletAddress,
  syncDepositWalletCollateralBalanceAllowance,
  toDepositWalletCalls,
  waitForDepositWalletDeployed,
  waitForDepositWalletTransaction,
} from './depositWallet';
import Engine from '../../../../../core/Engine';
import { POLYMARKET_V2_PROTOCOL } from './protocol/definitions';
import { OperationType } from './safe/types';
import { getL2Headers } from './utils';

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  query: jest.fn(),
}));

jest.mock('@metamask/eth-query', () =>
  jest.fn().mockImplementation(() => ({})),
);

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(() => 'polygon-mainnet'),
        getNetworkClientById: jest.fn(() => ({ provider: {} })),
      },
    },
  },
}));

jest.mock('./utils', () => ({
  getPolymarketEndpoints: jest.fn(() => ({
    CLOB_RELAYER: 'https://predict.api.cx.metamask.io',
  })),
  getL2Headers: jest.fn(),
}));

const mockGetL2Headers = jest.mocked(getL2Headers);
const mockQuery = jest.mocked(query);
const mockNetworkController = jest.mocked(Engine.context.NetworkController);
const mockFetch = jest.fn();

type MockResponseBody = Record<string, unknown> | Record<string, unknown>[];

function mockResponse(body: MockResponseBody, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

function getFetchBody(callIndex = 0): unknown {
  return JSON.parse(String(mockFetch.mock.calls[callIndex][1]?.body));
}

const ownerAddress = '0x1111111111111111111111111111111111111111';
const beaconAddress = '0x7A18EDfe055488A3128f01F563e5B479D92ffc3a';
const uupsWalletAddress = '0xfAeA0f08159fcF2f573fE24E9E989B0d48f7651B';
const beaconWalletAddress = '0x574548bC296A44a39a7828343FC262244f37a7e5';

const signer: Signer = {
  address: ownerAddress,
  signTypedMessage: jest.fn().mockResolvedValue('0xsignature'),
  signPersonalMessage: jest.fn(),
};

describe('depositWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
    mockGetL2Headers.mockResolvedValue({
      POLY_ADDRESS: ownerAddress,
      POLY_SIGNATURE: 'signature',
      POLY_TIMESTAMP: '1',
      POLY_API_KEY: 'api-key',
      POLY_PASSPHRASE: 'passphrase',
    });
  });

  it('derives the same address for checksum-equivalent owners', () => {
    const lowerCaseAddress = ownerAddress.toLowerCase();
    const checkSummedAddress = ownerAddress.toUpperCase().replace('0X', '0x');

    const lowerResult = deriveDepositWalletAddress(lowerCaseAddress);
    const checksumResult = deriveDepositWalletAddress(checkSummedAddress);

    expect(lowerResult).toMatch(/^0x[a-fA-F0-9]{40}$/u);
    expect(checksumResult).toBe(lowerResult);
  });

  it('derives legacy UUPS deposit-wallet address for owner', () => {
    const result = deriveDepositWalletUupsAddress(ownerAddress);

    expect(result).toBe(uupsWalletAddress);
    expect(deriveDepositWalletAddress(ownerAddress)).toBe(uupsWalletAddress);
  });

  it('derives beacon deposit-wallet address for owner', () => {
    const result = deriveDepositWalletBeaconAddress({
      ownerAddress,
      beaconAddress,
    });

    expect(result).toBe(beaconWalletAddress);
  });

  it('resolves UUPS wallet when factory beacon is unavailable', async () => {
    const readFactoryBeacon = jest.fn().mockResolvedValue(undefined);
    const isWalletDeployed = jest.fn();

    const result = await resolveDepositWalletAddress({
      ownerAddress,
      readFactoryBeacon,
      isWalletDeployed,
    });

    expect(result).toBe(uupsWalletAddress);
    expect(readFactoryBeacon).toHaveBeenCalledTimes(1);
    expect(isWalletDeployed).not.toHaveBeenCalled();
  });

  it('resolves deployed UUPS wallet when factory exposes beacon', async () => {
    const readFactoryBeacon = jest.fn().mockResolvedValue(beaconAddress);
    const isWalletDeployed = jest.fn().mockResolvedValue(true);

    const result = await resolveDepositWalletAddress({
      ownerAddress,
      readFactoryBeacon,
      isWalletDeployed,
    });

    expect(result).toBe(uupsWalletAddress);
    expect(isWalletDeployed).toHaveBeenCalledWith(uupsWalletAddress);
  });

  it('resolves beacon wallet when factory exposes beacon and UUPS wallet is undeployed', async () => {
    const readFactoryBeacon = jest.fn().mockResolvedValue(beaconAddress);
    const isWalletDeployed = jest.fn().mockResolvedValue(false);

    const result = await resolveDepositWalletAddress({
      ownerAddress,
      readFactoryBeacon,
      isWalletDeployed,
    });

    expect(result).toBe(beaconWalletAddress);
    expect(isWalletDeployed).toHaveBeenCalledWith(uupsWalletAddress);
  });

  it('reads factory beacon address from Polygon RPC', async () => {
    mockQuery.mockResolvedValue(
      `0x000000000000000000000000${beaconAddress.slice(2)}`,
    );

    const result = await readDepositWalletFactoryBeacon();

    expect(result).toBe(beaconAddress);
    expect(
      mockNetworkController.findNetworkClientIdByChainId,
    ).toHaveBeenCalledWith('0x89');
    expect(mockQuery).toHaveBeenCalledWith(expect.anything(), 'call', [
      {
        to: DEPOSIT_WALLET_FACTORY_ADDRESS,
        data: '0x49493a4d',
      },
    ]);
  });

  it('returns undefined when factory beacon call reverts', async () => {
    mockQuery.mockRejectedValue(
      Object.assign(new Error('execution reverted'), { code: 3 }),
    );

    const result = await readDepositWalletFactoryBeacon();

    expect(result).toBeUndefined();
  });

  it('throws contextual error when factory beacon response is malformed', async () => {
    mockQuery.mockResolvedValue('0x1234');

    await expect(readDepositWalletFactoryBeacon()).rejects.toThrow(
      'Polymarket deposit wallet factory BEACON returned malformed address data',
    );
  });

  it('throws contextual error when factory beacon call fails without revert', async () => {
    mockQuery.mockRejectedValue(new Error('network offline'));

    await expect(readDepositWalletFactoryBeacon()).rejects.toThrow(
      'Polymarket deposit wallet factory BEACON call failed: network offline',
    );
  });

  it('maps Safe transactions to deposit-wallet calls', () => {
    expect(
      toDepositWalletCalls([
        {
          to: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
          value: '0',
          data: '0x1234',
          operation: OperationType.Call,
        },
      ]),
    ).toEqual([
      {
        target: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
        value: '0',
        data: '0x1234',
      },
    ]);
  });

  it('requests wallet creation through the relayer proxy envelope', async () => {
    mockFetch.mockResolvedValue(mockResponse({ transactionID: 'relayer-1' }));

    const result = await requestDepositWalletCreate({ ownerAddress });

    expect(result.transactionID).toBe('relayer-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://predict.api.cx.metamask.io/transaction',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody()).toEqual({
      path: '/submit',
      method: 'POST',
      body: {
        type: 'WALLET-CREATE',
        from: ownerAddress,
        to: DEPOSIT_WALLET_FACTORY_ADDRESS,
      },
    });
  });

  it('reads wallet nonce through the relayer proxy envelope', async () => {
    mockFetch.mockResolvedValue(mockResponse({ nonce: '7' }));

    const nonce = await getDepositWalletNonce({ ownerAddress });

    expect(nonce).toBe('7');
    expect(getFetchBody()).toEqual({
      path: '/nonce',
      method: 'GET',
      query: {
        address: ownerAddress,
        type: 'WALLET',
      },
    });
  });

  it('signs and submits wallet batches through the relayer proxy envelope', async () => {
    const walletAddress = deriveDepositWalletAddress(ownerAddress);
    const calls = [
      {
        target: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
        value: '0',
        data: '0x1234',
      },
    ];
    mockFetch
      .mockResolvedValueOnce(mockResponse({ nonce: '9' }))
      .mockResolvedValueOnce(mockResponse({ transactionID: 'relayer-2' }));

    const result = await executeDepositWalletBatch({
      signer,
      walletAddress,
      calls,
    });

    expect(result.transactionID).toBe('relayer-2');
    expect(signer.signTypedMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        from: ownerAddress,
        data: expect.objectContaining({
          primaryType: 'Batch',
          message: expect.objectContaining({
            wallet: walletAddress,
            nonce: '9',
            calls,
          }),
        }),
      }),
      SignTypedDataVersion.V4,
    );
    expect(getFetchBody(1)).toEqual({
      path: '/submit',
      method: 'POST',
      body: expect.objectContaining({
        type: 'WALLET',
        from: ownerAddress,
        to: DEPOSIT_WALLET_FACTORY_ADDRESS,
        nonce: '9',
        signature: '0xsignature',
        depositWalletParams: expect.objectContaining({
          depositWallet: walletAddress,
          calls,
        }),
      }),
    });
  });

  it('polls by relayer id until wallet transaction hash is available', async () => {
    mockFetch.mockResolvedValue(
      mockResponse({
        state: 'STATE_MINED',
        transactionHash:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    );

    const hash = await waitForDepositWalletTransaction({
      transactionID: 'relayer-mined',
      pollIntervalMs: 0,
    });

    expect(hash).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(getFetchBody()).toEqual({
      path: '/transaction',
      method: 'GET',
      query: { id: 'relayer-mined' },
    });
  });

  it('returns hash before completion when completion is not required', async () => {
    mockFetch.mockResolvedValue(
      mockResponse({
        state: 'STATE_NEW',
        transactionHash:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      }),
    );

    const hash = await waitForDepositWalletTransaction({
      transactionID: 'relayer-hash',
      pollIntervalMs: 0,
    });

    expect(hash).toBe(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('polls until wallet transaction is confirmed when completion is required', async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockResponse({
          state: 'STATE_NEW',
          transactionHash:
            '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          state: 'STATE_CONFIRMED',
          transactionHash:
            '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        }),
      );

    const hash = await waitForDepositWalletTransaction({
      transactionID: 'relayer-3',
      requireCompletion: true,
      pollIntervalMs: 0,
    });

    expect(hash).toBe(
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it.each(['STATE_FAILED', 'STATE_INVALID'])(
    'throws when wallet transaction polling reaches %s',
    async (state) => {
      mockFetch.mockResolvedValue(mockResponse({ state }));

      await expect(
        waitForDepositWalletTransaction({
          transactionID: 'relayer-4',
          pollIntervalMs: 0,
        }),
      ).rejects.toThrow(state);
    },
  );

  it('keeps polling when completion succeeds without a hash', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ state: 'STATE_CONFIRMED' }))
      .mockResolvedValueOnce(
        mockResponse({
          state: 'STATE_CONFIRMED',
          transactionHash:
            '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        }),
      );

    const hash = await waitForDepositWalletTransaction({
      transactionID: 'relayer-no-hash-yet',
      requireCompletion: true,
      pollIntervalMs: 0,
    });

    expect(hash).toBe(
      '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws when wallet transaction polling times out', async () => {
    mockFetch.mockResolvedValue(mockResponse({ state: 'STATE_NEW' }));

    await expect(
      waitForDepositWalletTransaction({
        transactionID: 'relayer-timeout',
        maxPolls: 2,
        pollIntervalMs: 0,
      }),
    ).rejects.toThrow('Timed out');
  });

  it('executes a wallet batch and waits for relayer completion', async () => {
    const walletAddress = deriveDepositWalletAddress(ownerAddress);
    const calls = [
      {
        target: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
        value: '0',
        data: '0x1234',
      },
    ];
    mockFetch
      .mockResolvedValueOnce(mockResponse({ nonce: '11' }))
      .mockResolvedValueOnce(mockResponse({ transactionID: 'relayer-5' }))
      .mockResolvedValueOnce(
        mockResponse({
          state: 'STATE_CONFIRMED',
          transactionHash:
            '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        }),
      );

    const hash = await executeDepositWalletBatchAndWaitForCompletion({
      signer,
      walletAddress,
      calls,
    });

    expect(hash).toBe(
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    );
    expect(getFetchBody(2)).toEqual({
      path: '/transaction',
      method: 'GET',
      query: { id: 'relayer-5' },
    });
  });

  it('throws when completed wallet batch response is missing transactionID', async () => {
    const walletAddress = deriveDepositWalletAddress(ownerAddress);
    const calls = [
      {
        target: POLYMARKET_V2_PROTOCOL.collateral.tradingToken,
        value: '0',
        data: '0x1234',
      },
    ];
    mockFetch
      .mockResolvedValueOnce(mockResponse({ nonce: '12' }))
      .mockResolvedValueOnce(mockResponse({}));

    await expect(
      executeDepositWalletBatchAndWaitForCompletion({
        signer,
        walletAddress,
        calls,
      }),
    ).rejects.toThrow('missing transactionID');
  });

  it('polls relayer deployment status through the MetaMask proxy until the wallet is registered', async () => {
    const walletAddress = deriveDepositWalletAddress(ownerAddress);
    mockFetch
      .mockResolvedValueOnce(mockResponse({ deployed: false }))
      .mockResolvedValueOnce(mockResponse({ deployed: true }));

    await waitForDepositWalletDeployed({
      walletAddress,
      pollIntervalMs: 0,
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://predict.api.cx.metamask.io/transaction',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody()).toEqual({
      path: '/deployed',
      method: 'GET',
      query: {
        address: walletAddress,
        type: 'WALLET',
      },
    });
  });

  it('throws when relayer deployment status times out', async () => {
    const walletAddress = deriveDepositWalletAddress(ownerAddress);
    mockFetch.mockResolvedValue(mockResponse({ deployed: false }));

    await expect(
      waitForDepositWalletDeployed({
        walletAddress,
        maxPolls: 2,
        pollIntervalMs: 0,
      }),
    ).rejects.toThrow('Timed out');
  });

  it('syncs collateral balance allowance through direct CLOB endpoint', async () => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true }));

    await syncDepositWalletCollateralBalanceAllowance({
      protocol: POLYMARKET_V2_PROTOCOL,
      signerAddress: ownerAddress,
      apiKey: {
        apiKey: 'api-key',
        secret: 'secret',
        passphrase: 'passphrase',
      },
    });

    expect(mockGetL2Headers).toHaveBeenCalledWith({
      l2HeaderArgs: {
        method: 'GET',
        requestPath: '/balance-allowance/update',
      },
      address: ownerAddress,
      apiKey: {
        apiKey: 'api-key',
        secret: 'secret',
        passphrase: 'passphrase',
      },
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://clob.polymarket.com/balance-allowance/update?asset_type=COLLATERAL&signature_type=3',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
