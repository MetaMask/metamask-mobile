import {
  createDepositWalletPermit2FeeAuthorization,
  DEPOSIT_WALLET_FACTORY_ADDRESS,
  deriveDepositWalletAddress,
  executeDepositWalletBatch,
  getDepositWalletNonce,
  requestDepositWalletCreate,
  syncDepositWalletClobBalanceAllowance,
  toDepositWalletCalls,
  waitForDepositWalletTransaction,
} from './depositWallet';
import { getPermit2Nonce } from './safe/utils';
import { getL2Headers } from './utils';

jest.mock('./utils', () => ({
  getL2Headers: jest.fn(),
  getPolymarketEndpoints: jest.fn(() => ({
    CLOB_RELAYER: 'https://predict.api.cx.metamask.io',
  })),
}));

jest.mock('./safe/utils', () => ({
  getPermit2Nonce: jest.fn(),
}));

describe('deposit wallet helpers', () => {
  const mockFetch = jest.fn();
  const ownerAddress = '0x1111111111111111111111111111111111111111';
  const depositWalletAddress = '0x2222222222222222222222222222222222222222';
  const typedSignature = `0x${'11'.repeat(32)}${'22'.repeat(32)}1b`;
  const signer = {
    address: ownerAddress,
    signTypedMessage: jest.fn().mockResolvedValue(typedSignature),
    signPersonalMessage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
    (getL2Headers as jest.Mock).mockResolvedValue({
      POLY_ADDRESS: 'address',
      POLY_SIGNATURE: 'signature',
      POLY_TIMESTAMP: 'timestamp',
      POLY_API_KEY: 'apiKey',
      POLY_PASSPHRASE: 'passphrase',
    });
    (getPermit2Nonce as jest.Mock).mockResolvedValue('7');
    signer.signTypedMessage.mockResolvedValue(typedSignature);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('derives the deterministic deposit wallet address for an owner', () => {
    expect(
      deriveDepositWalletAddress(ownerAddress),
    ).toBe('0xfAeA0f08159fcF2f573fE24E9E989B0d48f7651B');
  });

  it('submits wallet create requests through the MetaMask relayer wrapper', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactionID: 'wallet-create-1' }),
    });

    await expect(
      requestDepositWalletCreate({
        ownerAddress,
      }),
    ).resolves.toEqual({ transactionID: 'wallet-create-1' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://predict.api.cx.metamask.io/wallet/create',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          owner: ownerAddress,
          factory: DEPOSIT_WALLET_FACTORY_ADDRESS,
        }),
      }),
    );
  });

  it('reads the deposit wallet nonce from the relayer wrapper', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ nonce: '42' }),
    });

    await expect(
      getDepositWalletNonce({
        ownerAddress,
      }),
    ).resolves.toBe('42');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://predict.api.cx.metamask.io/wallet/nonce',
      expect.objectContaining({
        body: JSON.stringify({
          owner: ownerAddress,
          type: 'WALLET',
        }),
      }),
    );
  });

  it('signs and submits deposit wallet batches with the current wallet nonce', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nonce: '42' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactionID: 'wallet-batch-1' }),
      });

    await expect(
      executeDepositWalletBatch({
        signer,
        walletAddress: depositWalletAddress,
        calls: [
          {
            target: '0x3333333333333333333333333333333333333333',
            value: '0',
            data: '0xabcdef',
          },
        ],
      }),
    ).resolves.toEqual({ transactionID: 'wallet-batch-1' });

    expect(signer.signTypedMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        from: ownerAddress,
        data: expect.objectContaining({
          domain: expect.objectContaining({
            name: 'DepositWallet',
            version: '1',
            verifyingContract: depositWalletAddress,
          }),
          primaryType: 'Batch',
          message: expect.objectContaining({
            wallet: depositWalletAddress,
            nonce: '42',
            deadline: '1700000240',
          }),
        }),
      }),
      'V4',
    );
    expect(mockFetch).toHaveBeenLastCalledWith(
      'https://predict.api.cx.metamask.io/wallet/execute',
      expect.objectContaining({
        body: JSON.stringify({
          owner: ownerAddress,
          factory: DEPOSIT_WALLET_FACTORY_ADDRESS,
          nonce: '42',
          signature: typedSignature,
          depositWalletParams: {
            depositWallet: depositWalletAddress,
            deadline: '1700000240',
            calls: [
              {
                target: '0x3333333333333333333333333333333333333333',
                value: '0',
                data: '0xabcdef',
              },
            ],
          },
        }),
      }),
    );
  });

  it('polls deposit wallet transactions until the relayer confirms them', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ state: 'STATE_PENDING' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ state: 'STATE_CONFIRMED' }],
      });

    await expect(
      waitForDepositWalletTransaction({
        transactionID: 'wallet-batch-1',
        pollIntervalMs: 0,
      }),
    ).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('rejects failed deposit wallet relayer transactions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ state: 'STATE_FAILED' }),
    });

    await expect(
      waitForDepositWalletTransaction({
        transactionID: 'wallet-batch-1',
        pollIntervalMs: 0,
      }),
    ).rejects.toThrow('Deposit wallet transaction failed: STATE_FAILED');
  });

  it('maps internal Safe-style calls to deposit wallet calls', () => {
    expect(
      toDepositWalletCalls([
        {
          to: '0x2222222222222222222222222222222222222222',
          value: '0',
          data: '0xabcdef',
          operation: 0,
        },
      ]),
    ).toEqual([
      {
        target: '0x2222222222222222222222222222222222222222',
        value: '0',
        data: '0xabcdef',
      },
    ]);
  });

  it('syncs CLOB collateral balance allowance with POLY_1271 signature type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await syncDepositWalletClobBalanceAllowance({
      protocol: {
        transport: {
          clobBaseUrl: 'https://clob.polymarket.com',
          clobVersionHeader: '2',
        },
      },
      signerAddress: ownerAddress,
      apiKey: {
        apiKey: 'key',
        secret: 'secret',
        passphrase: 'passphrase',
      },
    });

    expect(getL2Headers).toHaveBeenCalledWith({
      l2HeaderArgs: {
        method: 'GET',
        requestPath:
          '/balance-allowance/update?asset_type=COLLATERAL&signature_type=3',
      },
      address: ownerAddress,
      apiKey: {
        apiKey: 'key',
        secret: 'secret',
        passphrase: 'passphrase',
      },
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://clob.polymarket.com/balance-allowance/update?asset_type=COLLATERAL&signature_type=3',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('creates Permit2 fee authorizations signed by the deposit wallet owner', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const authorization = await createDepositWalletPermit2FeeAuthorization({
      signer,
      amount: 123n,
      spender: '0x3333333333333333333333333333333333333333',
      tokenAddress: '0x4444444444444444444444444444444444444444',
    });

    expect(signer.signTypedMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        from: ownerAddress,
        data: expect.objectContaining({
          domain: expect.objectContaining({ name: 'Permit2' }),
          primaryType: 'PermitTransferFrom',
          message: {
            permitted: {
              token: '0x4444444444444444444444444444444444444444',
              amount: '123',
            },
            spender: '0x3333333333333333333333333333333333333333',
            nonce: '7',
            deadline: '1700003600',
          },
        }),
      }),
      'V4',
    );
    expect(authorization).toEqual({
      type: 'safe-permit2',
      authorization: {
        permit: {
          permitted: {
            token: '0x4444444444444444444444444444444444444444',
            amount: '123',
          },
          spender: '0x3333333333333333333333333333333333333333',
          nonce: '7',
          deadline: '1700003600',
        },
        spender: '0x3333333333333333333333333333333333333333',
        signature: typedSignature,
      },
    });
  });
});
