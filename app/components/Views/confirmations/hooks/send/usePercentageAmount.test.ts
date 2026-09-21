import BN from 'bnjs4';
import { waitFor } from '@testing-library/react-native';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  ACCOUNT_ADDRESS_MOCK_1,
  ACCOUNT_ADDRESS_MOCK_2,
  evmSendStateMock,
  SOLANA_ASSET,
} from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { AssetType } from '../../types/token';
// eslint-disable-next-line import-x/no-namespace
import * as SendUtils from '../../utils/send';
import { estimateGas } from '../../../../../util/transaction-controller';
import {
  GasFeeEstimatesType,
  usePercentageAmount,
} from './usePercentageAmount';
import { useBalance } from './useBalance';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useIsNetworkGasSponsored } from '../../../../UI/Bridge/hooks/useIsNetworkGasSponsored';
import { isHardwareAccount } from '../../../../../util/address';

const MOCK_RECIPIENT_1 = '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477';
const MOCK_RECIPIENT_2 = '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a';
const NATIVE_ASSET = {
  chainId: '0x1',
  address: MOCK_RECIPIENT_2,
  decimals: 2,
  isNative: true,
};

let mockNetworkClientId = 'mainnet';
let mockGasFeeEstimates: GasFeeEstimatesType = {
  medium: { suggestedMaxFeePerGas: 1.5 },
};

jest.mock('@metamask/assets-controllers', () => ({
  getNativeTokenAddress: () => '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a',
}));

jest.mock('./useGasFeeEstimatesForSend', () => ({
  useGasFeeEstimatesForSend: () => ({
    gasFeeEstimates: mockGasFeeEstimates,
    networkClientId: mockNetworkClientId,
  }),
}));

jest.mock('../../../../../util/transaction-controller', () => ({
  estimateGas: jest.fn(),
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

jest.mock('../../../../UI/Bridge/hooks/useIsNetworkGasSponsored', () => ({
  useIsNetworkGasSponsored: jest.fn(),
}));

jest.mock('../../../../../util/address', () => ({
  isHardwareAccount: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};
const mockUseSendContext = jest.mocked(useSendContext);
const mockUseBalance = jest.mocked(useBalance);
const mockUseParams = jest.mocked(useParams);
const mockUseIsNetworkGasSponsored = jest.mocked(useIsNetworkGasSponsored);
const mockIsHardwareAccount = jest.mocked(isHardwareAccount);
const mockEstimateGas = jest.mocked(estimateGas);

const setNativeSendContext = (
  overrides: Partial<ReturnType<typeof useSendContext>> = {},
) => {
  mockUseSendContext.mockReturnValue({
    asset: NATIVE_ASSET,
    chainId: '0x1',
    from: ACCOUNT_ADDRESS_MOCK_1,
    to: MOCK_RECIPIENT_1,
    value: '10',
    ...overrides,
  } as unknown as ReturnType<typeof useSendContext>);
};

const setBalance = (rawBalance = '1000000000000000') => {
  mockUseBalance.mockReturnValue({
    balance: rawBalance,
    decimals: 2,
    rawBalanceBN: new BN(rawBalance),
  });
};

describe('usePercentageAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkClientId = 'mainnet';
    mockGasFeeEstimates = {
      medium: { suggestedMaxFeePerGas: 1.5 },
    };
    mockUseParams.mockReturnValue(undefined);
    mockUseIsNetworkGasSponsored.mockReturnValue(false);
    mockIsHardwareAccount.mockReturnValue(false);
    mockEstimateGas.mockResolvedValue({
      gas: '0x5208',
      simulationFails: undefined,
    });
    jest.spyOn(SendUtils, 'getLayer1GasFeeForSend').mockResolvedValue('0x0');
    setBalance();
  });

  it('reserves a legacy node estimate for native max', async () => {
    setNativeSendContext();

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    await waitFor(() => {
      expect(result.current.isMaxAmountSupported).toBe(true);
      expect(result.current.getPercentageAmount(100)).toBe('9685000000000');
    });
  });

  it('uses the sender as the estimation recipient before recipient selection', async () => {
    setNativeSendContext({ to: undefined });

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    await waitFor(() => {
      expect(result.current.isMaxAmountSupported).toBe(true);
      expect(mockEstimateGas).toHaveBeenCalledWith(
        expect.objectContaining({ to: ACCOUNT_ADDRESS_MOCK_1 }),
        'mainnet',
      );
    });
  });

  it('reserves a node estimate above 21,000 for native max', async () => {
    mockEstimateGas.mockResolvedValue({
      gas: '0x7530',
      simulationFails: undefined,
    });
    setNativeSendContext();

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    await waitFor(() => {
      expect(result.current.getPercentageAmount(100)).toBe('9550000000000');
    });
  });

  it.each([
    ['legacy tiers', { medium: '1.5' }],
    ['eth_gasPrice fallback', { gasPrice: '1.5' }],
  ])('reserves gas using %s estimates', async (_label, estimates) => {
    mockGasFeeEstimates = estimates;
    setNativeSendContext();

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    await waitFor(() => {
      expect(result.current.getPercentageAmount(100)).toBe('9685000000000');
    });
  });

  it('estimates with the complete native transaction and selected network client', async () => {
    setNativeSendContext({ value: '12.5' });

    renderHookWithProvider(() => usePercentageAmount(), mockState);

    await waitFor(() => {
      expect(mockEstimateGas).toHaveBeenCalledWith(
        {
          data: '0x',
          from: ACCOUNT_ADDRESS_MOCK_1,
          to: MOCK_RECIPIENT_1,
          value: '0xad78ebc5ac620000',
        },
        'mainnet',
      );
    });
  });

  it('re-estimates Max with the final recipient immediately before submission', async () => {
    setNativeSendContext();
    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );
    await waitFor(() => {
      expect(result.current.isMaxAmountSupported).toBe(true);
    });
    mockEstimateGas.mockResolvedValue({
      gas: '0x7530',
      simulationFails: undefined,
    });

    const maxAmount = await result.current.getMaxAmount(MOCK_RECIPIENT_2);

    expect(mockEstimateGas).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: MOCK_RECIPIENT_2 }),
      'mainnet',
    );
    expect(maxAmount).toBe('9550000000000');
  });

  it('returns unavailable when the final recipient estimate rejects', async () => {
    setNativeSendContext();
    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );
    await waitFor(() => {
      expect(result.current.isMaxAmountSupported).toBe(true);
    });
    mockEstimateGas.mockRejectedValue(new Error('estimate failed'));

    await expect(
      result.current.getMaxAmount(MOCK_RECIPIENT_2),
    ).resolves.toBeUndefined();
  });

  it('re-estimates when sender, recipient, chain, value, or network client changes', async () => {
    setNativeSendContext();
    const { rerender } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );
    await waitFor(() => expect(mockEstimateGas).toHaveBeenCalledTimes(1));

    setNativeSendContext({
      chainId: '0x2',
      from: ACCOUNT_ADDRESS_MOCK_2,
      to: MOCK_RECIPIENT_2,
      value: '11',
      asset: { ...NATIVE_ASSET, chainId: '0x2' } as AssetType,
    });
    mockNetworkClientId = 'secondary-network-client';
    rerender({});

    await waitFor(() => {
      expect(mockEstimateGas).toHaveBeenLastCalledWith(
        expect.objectContaining({
          from: ACCOUNT_ADDRESS_MOCK_2,
          to: MOCK_RECIPIENT_2,
          value: '0x98a7d9b8314c0000',
        }),
        'secondary-network-client',
      );
    });
  });

  it('discards a stale estimate after the transaction shape changes', async () => {
    let resolveFirstEstimate!: (value: {
      gas: string;
      simulationFails: undefined;
    }) => void;
    const firstEstimate = new Promise<{
      gas: string;
      simulationFails: undefined;
    }>((resolve) => {
      resolveFirstEstimate = resolve;
    });
    mockEstimateGas.mockReturnValueOnce(firstEstimate);
    setNativeSendContext();
    const { result, rerender } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    setNativeSendContext({ to: MOCK_RECIPIENT_2 });
    mockEstimateGas.mockResolvedValue({
      gas: '0x7530',
      simulationFails: undefined,
    });
    rerender({});
    expect(result.current.isMaxAmountSupported).toBe(false);
    expect(result.current.getPercentageAmount(100)).toBeUndefined();
    await waitFor(() => {
      expect(result.current.getPercentageAmount(100)).toBe('9550000000000');
    });

    resolveFirstEstimate({ gas: '0x5208', simulationFails: undefined });

    await waitFor(() => {
      expect(result.current.getPercentageAmount(100)).toBe('9550000000000');
    });
  });

  it('keeps Max unavailable while estimation is pending', () => {
    mockEstimateGas.mockReturnValue(new Promise(() => undefined));
    setNativeSendContext();

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    expect(result.current.isMaxAmountSupported).toBe(false);
    expect(result.current.getPercentageAmount(100)).toBeUndefined();
  });

  it('keeps Max unavailable when node estimation fails', async () => {
    mockEstimateGas.mockResolvedValue({
      gas: '0x5208',
      simulationFails: { reason: 'estimation failed' },
    } as Awaited<ReturnType<typeof estimateGas>>);
    setNativeSendContext();

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    await waitFor(() => expect(mockEstimateGas).toHaveBeenCalled());
    expect(result.current.isMaxAmountSupported).toBe(false);
    expect(result.current.getPercentageAmount(100)).toBeUndefined();
  });

  it('adds the L1 fee to the node-estimated gas reservation', async () => {
    jest.spyOn(SendUtils, 'getLayer1GasFeeForSend').mockResolvedValue('5');
    setNativeSendContext({
      asset: { ...NATIVE_ASSET, chainId: '0xa' } as AssetType,
      chainId: '0xa',
    });

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    await waitFor(() => {
      expect(result.current.getPercentageAmount(100)).toBe('9684999999999.95');
    });
  });

  it('returns the full balance for sponsored software accounts', () => {
    mockUseIsNetworkGasSponsored.mockReturnValue(true);
    setNativeSendContext();

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    expect(result.current.isMaxAmountSupported).toBe(true);
    expect(result.current.getPercentageAmount(100)).toBe('10000000000000');
    expect(mockEstimateGas).not.toHaveBeenCalled();
  });

  it('reserves node-estimated gas for sponsored hardware accounts', async () => {
    mockUseIsNetworkGasSponsored.mockReturnValue(true);
    mockIsHardwareAccount.mockReturnValue(true);
    setNativeSendContext();

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    await waitFor(() => {
      expect(result.current.getPercentageAmount(100)).toBe('9685000000000');
    });
  });

  it('does not use gas estimation for percentages below 100', () => {
    mockEstimateGas.mockReturnValue(new Promise(() => undefined));
    setNativeSendContext();

    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );

    expect(result.current.getPercentageAmount(75)).toBe('7500000000000');
    expect(result.current.getPercentageAmount(25)).toBe('2500000000000');
  });

  it('preserves non-EVM native percentage behavior', () => {
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

    expect(result.current.isMaxAmountSupported).toBe(false);
    expect(result.current.getPercentageAmount(75)).toBe('0.000000000000000007');
    expect(result.current.getPercentageAmount(100)).toBeUndefined();
  });
});
