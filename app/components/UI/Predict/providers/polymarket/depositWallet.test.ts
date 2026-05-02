import {
  DEPOSIT_WALLET_FACTORY_ADDRESS,
  deriveDepositWalletAddress,
  getDepositWalletNonce,
  requestDepositWalletCreate,
  syncDepositWalletClobBalanceAllowance,
  toDepositWalletCalls,
} from './depositWallet';
import { getL2Headers } from './utils';

jest.mock('./utils', () => ({
  getL2Headers: jest.fn(),
  getPolymarketEndpoints: jest.fn(() => ({
    CLOB_RELAYER: 'https://predict.api.cx.metamask.io',
  })),
}));

describe('deposit wallet helpers', () => {
  const mockFetch = jest.fn();

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
  });

  it('derives the deterministic deposit wallet address for an owner', () => {
    expect(
      deriveDepositWalletAddress('0x1111111111111111111111111111111111111111'),
    ).toBe('0xfAeA0f08159fcF2f573fE24E9E989B0d48f7651B');
  });

  it('submits wallet create requests through the MetaMask relayer wrapper', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transactionID: 'wallet-create-1' }),
    });

    await expect(
      requestDepositWalletCreate({
        ownerAddress: '0x1111111111111111111111111111111111111111',
      }),
    ).resolves.toEqual({ transactionID: 'wallet-create-1' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://predict.api.cx.metamask.io/wallet/create',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          owner: '0x1111111111111111111111111111111111111111',
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
        ownerAddress: '0x1111111111111111111111111111111111111111',
      }),
    ).resolves.toBe('42');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://predict.api.cx.metamask.io/wallet/nonce',
      expect.objectContaining({
        body: JSON.stringify({
          owner: '0x1111111111111111111111111111111111111111',
          type: 'WALLET',
        }),
      }),
    );
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
      signerAddress: '0x1111111111111111111111111111111111111111',
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
      address: '0x1111111111111111111111111111111111111111',
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
});
