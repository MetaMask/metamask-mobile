import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type { Signer } from '../types';
import {
  DEPOSIT_WALLET_FACTORY_ADDRESS,
  deriveDepositWalletAddress,
  executeDepositWalletBatch,
  getDepositWalletNonce,
  requestDepositWalletCreate,
  syncDepositWalletCollateralBalanceAllowance,
  toDepositWalletCalls,
  waitForDepositWalletDeployed,
  waitForDepositWalletTransaction,
} from './depositWallet';
import { POLYMARKET_V2_PROTOCOL } from './protocol/definitions';
import { OperationType } from './safe/types';
import { getL2Headers } from './utils';

jest.mock('./utils', () => ({
  getPolymarketEndpoints: jest.fn(() => ({
    CLOB_RELAYER: 'https://predict.api.cx.metamask.io',
  })),
  getL2Headers: jest.fn(),
}));

const mockGetL2Headers = jest.mocked(getL2Headers);
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

  it('polls by relayer id until wallet transaction is mined', async () => {
    mockFetch.mockResolvedValue(mockResponse({ state: 'STATE_MINED' }));

    await waitForDepositWalletTransaction({
      transactionID: 'relayer-mined',
      pollIntervalMs: 0,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(getFetchBody()).toEqual({
      path: '/transaction',
      method: 'GET',
      query: { id: 'relayer-mined' },
    });
  });

  it('polls until wallet transaction is confirmed', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ state: 'STATE_NEW' }))
      .mockResolvedValueOnce(mockResponse({ state: 'STATE_CONFIRMED' }));

    await waitForDepositWalletTransaction({
      transactionID: 'relayer-3',
      pollIntervalMs: 0,
    });

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
