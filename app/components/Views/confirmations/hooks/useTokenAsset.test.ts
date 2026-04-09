import merge from 'lodash/merge';
import { TransactionType } from '@metamask/transaction-controller';

import { strings } from '../../../../../locales/i18n';
import { useTokenAsset } from './useTokenAsset';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
} from '../../../UI/Earn/constants/musd';
import { MERKL_CLAIM_CHAIN_ID } from '../../../UI/Earn/components/MerklRewards/constants';

jest.mock('./transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn().mockReturnValue({
    chainId: '0x1',
    txParams: {
      to: '0x0000000000000000000000000000000000000000',
      from: '0x0000000000000000000000000000000000000000',
    },
  }),
}));

const mockUseTransactionMetadataRequest =
  useTransactionMetadataRequest as jest.Mock;

describe('useTokenAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: {
        to: '0x0000000000000000000000000000000000000000',
        from: '0x0000000000000000000000000000000000000000',
      },
    });
  });

  it('returns "unknown" token name and symbol when the asset symbol is not found', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: {
        to: '0x1234567890123456789012345678901234567890',
        from: '0x0000000000000000000000000000000000000000',
      },
    });

    const { result } = renderHookWithProvider(useTokenAsset, {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
          },
        },
      },
    });

    expect(result.current.displayName).toEqual(strings('token.unknown'));
  });

  it('returns asset', () => {
    const { result } = renderHookWithProvider(useTokenAsset, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current.asset).toMatchObject({
      name: 'Ethereum',
      symbol: 'Ethereum',
    });
    expect(result.current.displayName).toEqual('ETH');
  });

  it('returns correct token when non-EVM network is selected but sending EVM token', () => {
    const evmAddress = '0x0000000000000000000000000000000000000000';
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: {
        to: evmAddress,
        from: evmAddress,
      },
    });

    const stateWithNonEvmSelected = merge({}, stakingDepositConfirmationState, {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              selectedAccount: '0x0000000000000000000000000000000000000000',
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(useTokenAsset, {
      state: stateWithNonEvmSelected,
    });

    expect(result.current.asset).toMatchObject({
      name: 'Ethereum',
      symbol: 'Ethereum',
    });
    expect(result.current.displayName).toEqual('ETH');
  });

  it('returns "unknown" when chainId is not provided', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: undefined,
      txParams: {
        to: '0x0000000000000000000000000000000000000000',
        from: '0x0000000000000000000000000000000000000000',
      },
    });

    const { result } = renderHookWithProvider(useTokenAsset, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current.displayName).toEqual(strings('token.unknown'));
  });

  it('returns "unknown" when transaction metadata is not available', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(useTokenAsset, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current.displayName).toEqual(strings('token.unknown'));
  });

  describe('musdClaim', () => {
    const musdClaimMetadata = {
      type: TransactionType.musdClaim,
      chainId: MERKL_CLAIM_CHAIN_ID,
      txParams: {
        // txParams.to is the Merkl distributor contract, NOT the mUSD token
        to: '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae',
        from: '0x0000000000000000000000000000000000000000',
      },
    };

    it('falls back to MUSD_TOKEN constants when mUSD is not in wallet', () => {
      mockUseTransactionMetadataRequest.mockReturnValue(musdClaimMetadata);

      const { result } = renderHookWithProvider(useTokenAsset, {
        state: {
          engine: {
            backgroundState: {
              ...backgroundState,
            },
          },
        },
      });

      expect(result.current.displayName).toEqual(MUSD_TOKEN.symbol);
      expect(result.current.asset).toMatchObject({
        symbol: MUSD_TOKEN.symbol,
        name: MUSD_TOKEN.name,
        decimals: MUSD_TOKEN.decimals,
        address: MUSD_TOKEN_ADDRESS,
      });
    });

    it('returns mUSD asset from wallet when available', () => {
      mockUseTransactionMetadataRequest.mockReturnValue(musdClaimMetadata);

      const musdAsset = {
        address: MUSD_TOKEN_ADDRESS,
        symbol: 'MUSD',
        name: 'MUSD',
        decimals: 6,
        balance: '1000000',
        logo: 'musd.png',
      };

      const stateWithMusd = merge({}, stakingDepositConfirmationState, {
        engine: {
          backgroundState: {
            TokensController: {
              allTokens: {
                [MERKL_CLAIM_CHAIN_ID]: {
                  '0x0000000000000000000000000000000000000000': [musdAsset],
                },
              },
            },
          },
        },
      });

      const { result } = renderHookWithProvider(useTokenAsset, {
        state: stateWithMusd,
      });

      expect(result.current.displayName).toEqual('MUSD');
      expect(result.current.asset).toMatchObject({
        symbol: 'MUSD',
        name: 'MUSD',
      });
    });
  });
});
