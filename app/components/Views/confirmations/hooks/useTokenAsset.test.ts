import { strings } from '../../../../../locales/i18n';
import { useTokenAsset } from './useTokenAsset';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';

jest.mock('./transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn().mockReturnValue({
    chainId: '0x1',
    txParams: {
      to: '0x0000000000000000000000000000000000000000',
      from: '0x0000000000000000000000000000000000000000',
    },
  }),
}));

describe('useTokenAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns "unknown" token name and symbol when the asset symbol is not found', () => {
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
});
