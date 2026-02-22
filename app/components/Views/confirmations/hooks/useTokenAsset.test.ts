import merge from 'lodash/merge';

import { strings } from '../../../../../locales/i18n';
import { useTokenAsset } from './useTokenAsset';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

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
});
