import BN from 'bnjs4';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  ACCOUNT_ADDRESS_MOCK_1,
  evmSendStateMock,
} from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { AssetType } from '../../types/token';
// eslint-disable-next-line import-x/no-namespace
import * as SendUtils from '../../utils/send';
import { estimateGas } from '../../../../../util/transaction-controller';
import { useIsNetworkGasSponsored } from '../../../../UI/Bridge/hooks/useIsNetworkGasSponsored';
import { isHardwareAccount } from '../../../../../util/address';
import { useBalance } from './useBalance';
import {
  GasFeeEstimates,
  getEstimatedTotalGas,
  useSendMaxGasEstimator,
} from './useSendMaxGas';

const MOCK_RECIPIENT = '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477';
const NATIVE_ASSET = {
  chainId: '0xa',
  address: '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a',
  decimals: 18,
  isNative: true,
} as AssetType;

const createEip1559GasFee = () => ({
  maxWaitTimeEstimate: 0,
  minWaitTimeEstimate: 0,
  suggestedMaxFeePerGas: '1.5',
  suggestedMaxPriorityFeePerGas: '1',
});

const createFeeMarketEstimates = (): GasFeeEstimates => ({
  baseFeeTrend: null,
  estimatedBaseFee: '1',
  high: createEip1559GasFee(),
  historicalBaseFeeRange: null,
  historicalPriorityFeeRange: null,
  latestPriorityFeeRange: null,
  low: createEip1559GasFee(),
  medium: createEip1559GasFee(),
  networkCongestion: null,
  priorityFeeTrend: null,
});

const mockGasFeeEstimates = createFeeMarketEstimates();

// 21,000 gas at 1.5 gwei.
const GAS_COST_WEI = '31500000000000';

jest.mock('@metamask/assets-controllers', () => ({
  getNativeTokenAddress: () => '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a',
}));

jest.mock('./useGasFeeEstimatesForSend', () => ({
  useGasFeeEstimatesForSend: () => ({
    gasFeeEstimates: mockGasFeeEstimates,
    networkClientId: 'optimism',
  }),
}));

jest.mock('../../../../../util/transaction-controller', () => ({
  estimateGas: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('./useBalance', () => ({
  useBalance: jest.fn(),
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
const mockUseIsNetworkGasSponsored = jest.mocked(useIsNetworkGasSponsored);
const mockIsHardwareAccount = jest.mocked(isHardwareAccount);
const mockEstimateGas = jest.mocked(estimateGas);

const renderEstimator = () =>
  renderHookWithProvider(() => useSendMaxGasEstimator(), mockState);

describe('getEstimatedTotalGas', () => {
  it.each<[string, GasFeeEstimates]>([
    ['fee market', createFeeMarketEstimates()],
    ['legacy', { high: '2', low: '1', medium: '1.5' }],
    ['eth_gasPrice', { gasPrice: '1.5' }],
  ])(
    'multiplies the %s fee rate by the gas limit and adds the L1 fee',
    (_label, estimates) => {
      expect(getEstimatedTotalGas(estimates, '0x5208', '0x5')?.toString()).toBe(
        '31500000000005',
      );
    },
  );

  it('returns undefined when no fee rate can be read', () => {
    expect(
      getEstimatedTotalGas({} as GasFeeEstimates, '0x5208', '0x0'),
    ).toBeUndefined();
  });
});

describe('useSendMaxGasEstimator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSendContext.mockReturnValue({
      asset: NATIVE_ASSET,
      chainId: '0xa',
      from: ACCOUNT_ADDRESS_MOCK_1,
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseBalance.mockReturnValue({
      balance: '1',
      decimals: 18,
      rawBalanceBN: new BN('1000000000000000000'),
    });
    mockUseIsNetworkGasSponsored.mockReturnValue(false);
    mockIsHardwareAccount.mockReturnValue(false);
    mockEstimateGas.mockResolvedValue({
      gas: '0x5208',
      simulationFails: undefined,
    });
    jest.spyOn(SendUtils, 'getLayer1GasFeeForSend').mockResolvedValue('0x0');
  });

  it('estimates the gas cost for the requested recipient', async () => {
    const { result } = renderEstimator();

    const gasCost = await result.current.getGasCost(MOCK_RECIPIENT);

    expect(gasCost?.toString()).toBe(GAS_COST_WEI);
    expect(mockEstimateGas).toHaveBeenCalledWith(
      expect.objectContaining({ to: MOCK_RECIPIENT }),
      'optimism',
    );
  });

  it('adds the L1 fee to the gas cost', async () => {
    jest.spyOn(SendUtils, 'getLayer1GasFeeForSend').mockResolvedValue('0x5');
    const { result } = renderEstimator();

    const gasCost = await result.current.getGasCost(MOCK_RECIPIENT);

    expect(gasCost?.toString()).toBe('31500000000005');
  });

  it('returns zero without estimating for sponsored software accounts', async () => {
    mockUseIsNetworkGasSponsored.mockReturnValue(true);
    const { result } = renderEstimator();

    const gasCost = await result.current.getGasCost(MOCK_RECIPIENT);

    expect(gasCost?.toString()).toBe('0');
    expect(mockEstimateGas).not.toHaveBeenCalled();
  });

  it('returns undefined when the gas limit estimate rejects', async () => {
    mockEstimateGas.mockRejectedValue(new Error('estimate failed'));
    const { result } = renderEstimator();

    await expect(
      result.current.getGasCost(MOCK_RECIPIENT),
    ).resolves.toBeUndefined();
  });

  it('returns undefined when the simulation fails', async () => {
    mockEstimateGas.mockResolvedValue({
      gas: '0x5208',
      simulationFails: { reason: 'estimation failed' },
    } as Awaited<ReturnType<typeof estimateGas>>);
    const { result } = renderEstimator();

    await expect(
      result.current.getGasCost(MOCK_RECIPIENT),
    ).resolves.toBeUndefined();
  });
});
