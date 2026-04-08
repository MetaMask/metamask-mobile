import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  getAvailableTokens,
  getBlockedTokensForTransactionType,
  getRequiredBalance,
  getTokenAddress,
  getTokenTransferData,
  isTokenBlocked,
} from './transaction-pay';
import { PERPS_MINIMUM_DEPOSIT } from '../constants/perps';
import { PREDICT_MINIMUM_DEPOSIT } from '../constants/predict';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import { AssetType, TokenStandard } from '../types/token';
import {
  TransactionPayRequiredToken,
  TransactionPaymentToken,
} from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { store } from '../../../../store';
import {
  selectGasFeeTokenFlags,
  BlockedTokensListConfig,
  BlockedTokensConfig,
} from '../../../../selectors/featureFlagController/confirmations';
import { strings } from '../../../../../locales/i18n';

jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../../../../selectors/featureFlagController/confirmations', () => ({
  selectGasFeeTokenFlags: jest.fn(),
}));

const CHAIN_ID_MOCK = '0x1';
const TO_MOCK = '0x0987654321098765432109876543210987654321';

const TOKEN_TRANSFER_DATA_MOCK =
  '0xa9059cbb0000000000000000000000007e5f4552091a69125d5dfcb7b8c2659029395bdf000000000000000000000000000000000000000000000000000000000000012c;';

const TOKEN_MOCK = {
  accountType: EthAccountType.Eoa,
  address: NATIVE_TOKEN_ADDRESS,
  balance: '1.23',
  balanceInSelectedCurrency: '$1.23',
  chainId: CHAIN_ID_MOCK,
  decimals: 18,
  name: 'Native Token 1',
  standard: TokenStandard.ERC20,
  symbol: 'NTV1',
} as AssetType;

const ERC20_TOKEN_MOCK = {
  ...TOKEN_MOCK,
  address: '0x1234567890abcdef1234567890abcdef12345678',
  name: 'Test Token',
  symbol: 'TST',
  balance: '2.34',
} as AssetType;

describe('Transaction Pay Utils', () => {
  const selectGasFeeTokenFlagsMock = jest.mocked(selectGasFeeTokenFlags);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(store.getState).mockReturnValue({} as never);
    selectGasFeeTokenFlagsMock.mockReturnValue({ gasFeeTokens: {} });
  });

  describe('getRequiredBalance', () => {
    it('returns value if transaction type is perps deposit', () => {
      const transactionMeta = {
        type: TransactionType.perpsDeposit,
      } as TransactionMeta;

      expect(getRequiredBalance(transactionMeta)).toBe(PERPS_MINIMUM_DEPOSIT);
    });

    it('returns value if transaction type is predict deposit', () => {
      const transactionMeta = {
        nestedTransactions: [{ type: TransactionType.predictDeposit }],
      } as TransactionMeta;

      expect(getRequiredBalance(transactionMeta)).toBe(PREDICT_MINIMUM_DEPOSIT);
    });

    it('returns undefined if unsupported transaction type', () => {
      const transactionMeta = {
        type: TransactionType.simpleSend,
      } as TransactionMeta;

      expect(getRequiredBalance(transactionMeta)).toBeUndefined();
    });
  });

  describe('getTokenTransferData', () => {
    it('returns undefined if no token transfer data', () => {
      const transactionMeta = {
        txParams: {
          data: '0x1234',
          to: TO_MOCK,
        },
      } as TransactionMeta;

      expect(getTokenTransferData(transactionMeta)).toBeUndefined();
    });

    it('returns data from single transaction token transfer', () => {
      const transactionMeta = {
        txParams: {
          data: TOKEN_TRANSFER_DATA_MOCK,
          to: TO_MOCK,
        },
      } as TransactionMeta;

      expect(getTokenTransferData(transactionMeta)).toStrictEqual({
        data: TOKEN_TRANSFER_DATA_MOCK,
        to: TO_MOCK,
        index: undefined,
      });
    });

    it('returns data from nested transaction token transfer', () => {
      const transactionMeta = {
        txParams: {
          data: '0x1234',
          to: '0x5678',
        },
        nestedTransactions: [
          {
            data: '0x123456',
            to: '0x567890',
          },
          {
            data: TOKEN_TRANSFER_DATA_MOCK,
            to: TO_MOCK,
          },
        ],
      } as unknown as TransactionMeta;

      expect(getTokenTransferData(transactionMeta)).toStrictEqual({
        data: TOKEN_TRANSFER_DATA_MOCK,
        to: TO_MOCK,
        index: 1,
      });
    });
  });

  describe('getTokenAddress', () => {
    it('returns token address from nested token transfer', () => {
      const transactionMeta = {
        txParams: {
          data: '0x1234',
          to: '0x5678',
        },
        nestedTransactions: [
          {
            data: '0x123456',
            to: '0x567890',
          },
          {
            data: TOKEN_TRANSFER_DATA_MOCK,
            to: TO_MOCK,
          },
        ],
      } as unknown as TransactionMeta;

      expect(getTokenAddress(transactionMeta)).toBe(TO_MOCK);
    });

    it('returns to param if no nested transfer', () => {
      const transactionMeta = {
        txParams: {
          data: TOKEN_TRANSFER_DATA_MOCK,
          to: TO_MOCK,
        },
      } as TransactionMeta;

      expect(getTokenAddress(transactionMeta)).toBe(TO_MOCK);
    });
  });

  describe('getAvailableTokens', () => {
    it('returns tokens if balance', () => {
      const result = getAvailableTokens({
        tokens: [TOKEN_MOCK] as AssetType[],
      });

      expect(result).toMatchObject([TOKEN_MOCK]);
    });

    it('returns token with zero balance if required token', async () => {
      const tokenWithZeroBalance = {
        ...TOKEN_MOCK,
        balance: '0',
        balanceInSelectedCurrency: '$0.00',
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenWithZeroBalance] as AssetType[],
        requiredTokens: [
          {
            address: TOKEN_MOCK.address as Hex,
            chainId: TOKEN_MOCK.chainId as Hex,
          } as TransactionPayRequiredToken,
        ],
      });

      expect(result).toMatchObject([tokenWithZeroBalance]);
    });

    it('returns token with zero balance if payment token', async () => {
      const tokenWithZeroBalance = {
        ...TOKEN_MOCK,
        balance: '0',
        balanceInSelectedCurrency: '$0.00',
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenWithZeroBalance] as AssetType[],
        payToken: {
          address: TOKEN_MOCK.address as Hex,
          chainId: TOKEN_MOCK.chainId as Hex,
        } as TransactionPaymentToken,
      });

      expect(result).toMatchObject([tokenWithZeroBalance]);
    });

    it('does not return token if no balance', async () => {
      const tokenWithZeroBalance = {
        ...TOKEN_MOCK,
        balance: '0',
        balanceInSelectedCurrency: '$0.00',
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenWithZeroBalance] as AssetType[],
      });

      expect(result).toStrictEqual([]);
    });

    it('does not return token if not ERC-20', async () => {
      const tokenWithWrongStandard = {
        ...TOKEN_MOCK,
        standard: TokenStandard.ERC721,
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenWithWrongStandard] as AssetType[],
      });

      expect(result).toStrictEqual([]);
    });

    it('does not return token if account type is not EVM', async () => {
      const tokenWithWrongAccountType = {
        ...TOKEN_MOCK,
        accountType: SolAccountType.DataAccount,
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenWithWrongAccountType] as AssetType[],
      });

      expect(result).toStrictEqual([]);
    });

    it('does not return token if on testnet', async () => {
      const tokenOnTestNet = {
        ...TOKEN_MOCK,
        chainId: CHAIN_IDS.SEPOLIA,
      } as AssetType;

      const result = getAvailableTokens({
        tokens: [tokenOnTestNet] as AssetType[],
      });

      expect(result).toStrictEqual([]);
    });

    describe('disabled', () => {
      it('marks token as disabled when no native balance and no gas station support', () => {
        const result = getAvailableTokens({
          tokens: [
            ERC20_TOKEN_MOCK,
            { ...TOKEN_MOCK, balance: '0' } as AssetType,
          ],
        });

        expect(result).toHaveLength(1);
        expect(result[0].disabled).toBe(true);
        expect(result[0].disabledMessage).toBe(
          strings('pay_with_modal.no_gas'),
        );
      });

      it('marks token as enabled when native balance exists', () => {
        const result = getAvailableTokens({
          tokens: [ERC20_TOKEN_MOCK, TOKEN_MOCK],
        });

        expect(result).toHaveLength(2);
        expect(result[0].disabled).toBe(false);
        expect(result[0].disabledMessage).toBeUndefined();
      });

      it('marks token as enabled when no native balance but gas station supports token', () => {
        selectGasFeeTokenFlagsMock.mockReturnValue({
          gasFeeTokens: {
            [CHAIN_ID_MOCK]: {
              name: 'Ethereum',
              tokens: [
                {
                  name: 'Test Token',
                  address: ERC20_TOKEN_MOCK.address as Hex,
                },
              ],
            },
          },
        });

        const result = getAvailableTokens({
          tokens: [
            ERC20_TOKEN_MOCK,
            { ...TOKEN_MOCK, balance: '0' } as AssetType,
          ],
        });

        expect(result).toHaveLength(1);
        expect(result[0].disabled).toBe(false);
        expect(result[0].disabledMessage).toBeUndefined();
      });

      it('marks token as disabled when native token is not found in tokens list', () => {
        const result = getAvailableTokens({
          tokens: [ERC20_TOKEN_MOCK],
        });

        expect(result).toHaveLength(1);
        expect(result[0].disabled).toBe(true);
        expect(result[0].disabledMessage).toBe(
          strings('pay_with_modal.no_gas'),
        );
      });
    });

    describe('fiatPayment', () => {
      it('clears isSelected on all tokens when fiat payment is active', () => {
        const result = getAvailableTokens({
          tokens: [TOKEN_MOCK],
          payToken: {
            address: TOKEN_MOCK.address as Hex,
            chainId: TOKEN_MOCK.chainId as Hex,
          } as TransactionPaymentToken,
          fiatPayment: { selectedPaymentMethodId: 'pm-card' },
        });

        expect(result).toHaveLength(1);
        expect(result[0].isSelected).toBe(false);
      });

      it('preserves isSelected when fiat payment has no selected method', () => {
        const result = getAvailableTokens({
          tokens: [TOKEN_MOCK],
          payToken: {
            address: TOKEN_MOCK.address as Hex,
            chainId: TOKEN_MOCK.chainId as Hex,
          } as TransactionPaymentToken,
          fiatPayment: {},
        });

        expect(result).toHaveLength(1);
        expect(result[0].isSelected).toBe(true);
      });
    });

    describe('blockedTokens', () => {
      it('marks token as disabled when its chain is in blocklist chainIds', () => {
        const blockedTokens: BlockedTokensListConfig = {
          chainIds: [CHAIN_ID_MOCK],
          tokens: [],
        };

        const result = getAvailableTokens({
          tokens: [TOKEN_MOCK, ERC20_TOKEN_MOCK],
          blockedTokens,
        });

        expect(result).toHaveLength(2);
        expect(result[0].disabled).toBe(true);
        expect(result[0].disabledMessage).toBe(
          strings('pay_with_modal.not_supported'),
        );
        expect(result[1].disabled).toBe(true);
        expect(result[1].disabledMessage).toBe(
          strings('pay_with_modal.not_supported'),
        );
      });

      it('marks specific token as disabled when address+chainId matches blocklist', () => {
        const blockedTokens: BlockedTokensListConfig = {
          chainIds: [],
          tokens: [
            {
              address: ERC20_TOKEN_MOCK.address,
              chainId: ERC20_TOKEN_MOCK.chainId as string,
            },
          ],
        };

        const result = getAvailableTokens({
          tokens: [TOKEN_MOCK, ERC20_TOKEN_MOCK],
          blockedTokens,
        });

        expect(result).toHaveLength(2);
        expect(result[0].disabled).toBe(false);
        expect(result[1].disabled).toBe(true);
        expect(result[1].disabledMessage).toBe(
          strings('pay_with_modal.not_supported'),
        );
      });

      it('sorts blocked tokens to the bottom of the list', () => {
        const blockedTokens: BlockedTokensListConfig = {
          chainIds: [],
          tokens: [
            {
              address: TOKEN_MOCK.address,
              chainId: TOKEN_MOCK.chainId as string,
            },
          ],
        };

        const result = getAvailableTokens({
          tokens: [TOKEN_MOCK, ERC20_TOKEN_MOCK],
          blockedTokens,
        });

        expect(result).toHaveLength(2);
        expect(result[0].address).toBe(ERC20_TOKEN_MOCK.address);
        expect(result[0].disabled).toBe(false);
        expect(result[1].address).toBe(TOKEN_MOCK.address);
        expect(result[1].disabled).toBe(true);
      });

      it('does not disable non-blocked tokens', () => {
        const blockedTokens: BlockedTokensListConfig = {
          chainIds: ['0x999'],
          tokens: [{ address: '0xunrelated', chainId: '0x999' }],
        };

        const result = getAvailableTokens({
          tokens: [TOKEN_MOCK, ERC20_TOKEN_MOCK],
          blockedTokens,
        });

        expect(result).toHaveLength(2);
        expect(result[0].disabled).toBe(false);
        expect(result[1].disabled).toBe(false);
      });

      it('keeps no-gas disabled message when token is disabled for no gas but not blocked', () => {
        const blockedTokens: BlockedTokensListConfig = {
          chainIds: [],
          tokens: [],
        };

        const result = getAvailableTokens({
          tokens: [
            ERC20_TOKEN_MOCK,
            { ...TOKEN_MOCK, balance: '0' } as AssetType,
          ],
          blockedTokens,
        });

        expect(result).toHaveLength(1);
        expect(result[0].disabled).toBe(true);
        expect(result[0].disabledMessage).toBe(
          strings('pay_with_modal.no_gas'),
        );
      });
    });
  });

  describe('getBlockedTokensForTransactionType', () => {
    const defaultBlocked: BlockedTokensListConfig = {
      chainIds: ['0x1'],
      tokens: [],
    };

    const perpsBlocked: BlockedTokensListConfig = {
      chainIds: ['0xa4b1'],
      tokens: [{ address: '0xabc', chainId: '0x1' }],
    };

    const config: BlockedTokensConfig = {
      default: defaultBlocked,
      overrides: {
        perpsDeposit: perpsBlocked,
      },
    };

    it('returns override when transaction type has an override', () => {
      expect(
        getBlockedTokensForTransactionType(config, 'perpsDeposit'),
      ).toEqual(perpsBlocked);
    });

    it('returns default when transaction type has no override', () => {
      expect(
        getBlockedTokensForTransactionType(config, 'predictDeposit'),
      ).toEqual(defaultBlocked);
    });

    it('returns default when transaction type is undefined', () => {
      expect(getBlockedTokensForTransactionType(config, undefined)).toEqual(
        defaultBlocked,
      );
    });

    it('returns safe defaults when override has missing chainIds or tokens', () => {
      const partialConfig = {
        default: defaultBlocked,
        overrides: {
          perpsDeposit: {} as BlockedTokensListConfig,
        },
      };

      const result = getBlockedTokensForTransactionType(
        partialConfig,
        'perpsDeposit',
      );
      expect(result).toEqual({ chainIds: [], tokens: [] });
    });
  });

  describe('isTokenBlocked', () => {
    const blockedConfig: BlockedTokensListConfig = {
      chainIds: ['0xa4b1'],
      tokens: [{ address: '0xabc', chainId: '0x1' }],
    };

    it('returns true when token chain is in blocked chainIds', () => {
      expect(
        isTokenBlocked({ address: '0xany', chainId: '0xa4b1' }, blockedConfig),
      ).toBe(true);
    });

    it('returns true when token address+chainId matches a blocked token', () => {
      expect(
        isTokenBlocked({ address: '0xABC', chainId: '0x1' }, blockedConfig),
      ).toBe(true);
    });

    it('returns false when token does not match any blocked entry', () => {
      expect(
        isTokenBlocked({ address: '0xdef', chainId: '0x89' }, blockedConfig),
      ).toBe(false);
    });

    it('returns false with empty blocked config', () => {
      expect(
        isTokenBlocked(
          { address: '0xabc', chainId: '0x1' },
          { chainIds: [], tokens: [] },
        ),
      ).toBe(false);
    });
  });
});
