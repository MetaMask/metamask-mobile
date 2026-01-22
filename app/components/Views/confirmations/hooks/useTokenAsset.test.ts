import { strings } from '../../../../../locales/i18n';
import { useTokenAsset } from './useTokenAsset';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

jest.mock('./transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

const mockedUseTransactionMetadataRequest =
  useTransactionMetadataRequest as jest.MockedFunction<
    typeof useTransactionMetadataRequest
  >;

describe('useTokenAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for most tests
    mockedUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: {
        to: '0x0000000000000000000000000000000000000000',
        from: '0x0000000000000000000000000000000000000000',
      },
    } as ReturnType<typeof useTransactionMetadataRequest>);
  });

  it('returns "unknown" token name and symbol when the token is not found', () => {
    // Use an ERC20 contract address that doesn't exist in any token list
    mockedUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: {
        // Unknown ERC20 token contract address
        to: '0x1234567890123456789012345678901234567890',
        from: '0xc5b8dbac4c1d3f152cdeb400e2313f309c410acb',
      },
    } as ReturnType<typeof useTransactionMetadataRequest>);

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

  it('returns "unknown" when chainId is missing', () => {
    mockedUseTransactionMetadataRequest.mockReturnValue({
      chainId: undefined,
      txParams: {
        to: '0x0000000000000000000000000000000000000000',
        from: '0x0000000000000000000000000000000000000000',
      },
    } as unknown as ReturnType<typeof useTransactionMetadataRequest>);

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

  it('returns asset using transaction from address for token lookup', () => {
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
