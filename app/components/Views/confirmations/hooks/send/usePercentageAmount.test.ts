import BN from 'bnjs4';
import { waitFor } from '@testing-library/react-native';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  ACCOUNT_ADDRESS_MOCK_2,
  evmSendStateMock,
  SOLANA_ASSET,
} from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
// eslint-disable-next-line import/no-namespace
import * as SendUtils from '../../utils/send';
import { usePercentageAmount } from './usePercentageAmount';
import { useBalance } from './useBalance';
import { useParams } from '../../../../../util/navigation/navUtils';

jest.mock('@metamask/assets-controllers', () => ({
  getNativeTokenAddress: () => '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a',
}));

jest.mock('../gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: () => ({
    gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
  }),
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('./useBalance', () => ({
  useBalance: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

const mockUseBalance = useBalance as jest.MockedFunction<typeof useBalance>;

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('usePercentageAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue(undefined);
  });

  it('return required fields', () => {
    mockUseSendContext.mockReturnValue({
      asset: {},
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '',
      decimals: 0,
      rawBalanceBN: new BN('0'),
    });

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );
    expect(result.current.isMaxAmountSupported).toBeDefined();
    expect(result.current.getPercentageAmount).toBeDefined();
  });

  it('return correct perentage amount for non-native token for chain', () => {
    mockUseSendContext.mockReturnValue({
      asset: { chainId: '0x1', decimals: 2 },
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '1000',
      decimals: 2,
      rawBalanceBN: new BN('1000'),
    });

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );
    expect(result.current.isMaxAmountSupported).toBeTruthy();
    expect(result.current.getPercentageAmount(100)).toEqual('10');
    expect(result.current.getPercentageAmount(75)).toEqual('7.5');
    expect(result.current.getPercentageAmount(25)).toEqual('2.5');
  });

  it('isMaxAmountSupported is false for solana native asset', () => {
    mockUseSendContext.mockReturnValue({
      asset: SOLANA_ASSET,
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '10',
      decimals: 0,
      rawBalanceBN: new BN('10'),
    });

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );
    expect(result.current.isMaxAmountSupported).toEqual(false);
    expect(result.current.getPercentageAmount(75)).toEqual(
      '0.000000000000000007',
    );
    expect(result.current.getPercentageAmount(100)).toEqual(undefined);
  });

  it('return correct max value for native asset', () => {
    mockUseSendContext.mockReturnValue({
      asset: {
        chainId: '0x1',
        address: '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a',
        decimals: 2,
        isNative: true,
      },
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '1000000000000000',
      decimals: 2,
      rawBalanceBN: new BN('1000000000000000'),
    });

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );
    expect(result.current.isMaxAmountSupported).toBeTruthy();
    expect(result.current.getPercentageAmount(100)).toEqual('9685000000000');
  });

  it('return zero if amount of asset available is less than gas', () => {
    mockUseSendContext.mockReturnValue({
      asset: {
        chainId: '0x1',
        address: '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a',
        decimals: 2,
        isNative: true,
      },
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '100',
      decimals: 2,
      rawBalanceBN: new BN('100'),
    });

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );
    expect(result.current.isMaxAmountSupported).toBeTruthy();
    expect(result.current.getPercentageAmount(100)).toEqual('0');
    expect(result.current.getPercentageAmount(50)).toEqual('0');
  });

  it('adjust L1 fee for optimism mainnet', async () => {
    mockUseSendContext.mockReturnValue({
      asset: {
        chainId: '0xa',
        address: '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a',
        decimals: 2,
        isNative: true,
      },
      from: ACCOUNT_ADDRESS_MOCK_2,
      value: '10',
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '1000000000000000',
      decimals: 2,
      rawBalanceBN: new BN('1000000000000000'),
    });
    jest.spyOn(SendUtils, 'getLayer1GasFeeForSend').mockResolvedValue('0x5');

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );
    expect(result.current.isMaxAmountSupported).toBeTruthy();
    await waitFor(() => {
      expect(result.current.getPercentageAmount(100)).toEqual(
        '9684999999999.95',
      );
    });
  });
});
