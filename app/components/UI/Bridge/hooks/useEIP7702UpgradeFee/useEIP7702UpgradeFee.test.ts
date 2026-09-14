import { act, waitFor } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import type { NetworkConfiguration } from '@metamask/network-controller';
import {
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  TransactionEnvelopeType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { selectSourceToken } from '../../../../../core/redux/slices/bridge';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectConversionRateByChainId } from '../../../../../selectors/currencyRateController';
import {
  checkNetworkAndAccountSupports1559,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../../selectors/networkController';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { getEIP7702AccountUpgradeStatus } from '../../utils/eip7702AccountUpgrade';
import { useEIP7702UpgradeFee } from '.';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      fetchGasFeeEstimates: jest.fn(),
    },
    TransactionController: {
      estimateGas: jest.fn(),
      estimateGasFee: jest.fn(),
      getLayer1GasFee: jest.fn(),
    },
  },
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectSourceToken: jest.fn(),
}));

jest.mock('../../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../../selectors/bridge'),
  selectSourceWalletAddress: jest.fn(),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  ...jest.requireActual('../../../../../selectors/currencyRateController'),
  selectConversionRateByChainId: jest.fn(),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  checkNetworkAndAccountSupports1559: jest.fn(),
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../../../selectors/settings', () => ({
  ...jest.requireActual('../../../../../selectors/settings'),
  selectShowFiatInTestnets: jest.fn(),
}));

jest.mock('../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter', () =>
  jest.fn(),
);

jest.mock('../../utils/eip7702AccountUpgrade', () => ({
  ...jest.requireActual('../../utils/eip7702AccountUpgrade'),
  getEIP7702AccountUpgradeStatus: jest.fn(),
}));

const ADDRESS = '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477' as Hex;
const UPGRADE_ADDRESS = '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b' as Hex;
const NETWORK = {
  chainId: '0x1',
  defaultRpcEndpointIndex: 0,
  nativeCurrency: 'ETH',
  rpcEndpoints: [{ networkClientId: 'mainnet' }],
} as unknown as NetworkConfiguration;
const FEE_MARKET_ESTIMATES = {
  type: GasFeeEstimateType.FeeMarket,
  [GasFeeEstimateLevel.Low]: {
    maxFeePerGas: '0x4a817c800',
    maxPriorityFeePerGas: '0x77359400',
  },
  [GasFeeEstimateLevel.Medium]: {
    maxFeePerGas: '0x4a817c800',
    maxPriorityFeePerGas: '0x77359400',
  },
  [GasFeeEstimateLevel.High]: {
    maxFeePerGas: '0x4a817c800',
    maxPriorityFeePerGas: '0x77359400',
  },
} as const;

const mockEstimateGas = jest.mocked(
  Engine.context.TransactionController.estimateGas,
);
const mockEstimateGasFee = jest.mocked(
  Engine.context.TransactionController.estimateGasFee,
);
const mockGetLayer1GasFee = jest.mocked(
  Engine.context.TransactionController.getLayer1GasFee,
);
const mockFetchGasFeeEstimates = jest.mocked(
  Engine.context.GasFeeController.fetchGasFeeEstimates,
);
const mockGetUpgradeStatus = jest.mocked(getEIP7702AccountUpgradeStatus);
const mockSelectSourceToken = jest.mocked(selectSourceToken);
const mockSelectSourceWalletAddress = jest.mocked(selectSourceWalletAddress);
const mockSelectNetworkConfigurations = jest.mocked(
  selectEvmNetworkConfigurationsByChainId,
);
const mockCheckNetworkAndAccountSupports1559 = jest.mocked(
  checkNetworkAndAccountSupports1559,
);
const mockSelectConversionRate = jest.mocked(selectConversionRateByChainId);
const mockSelectShowFiatInTestnets = jest.mocked(selectShowFiatInTestnets);
const mockUseFiatFormatter = jest.mocked(useFiatFormatter);

function arrangeSuccessfulEstimate() {
  mockGetUpgradeStatus.mockResolvedValue({
    isUpgradeRequired: true,
    address: ADDRESS,
    upgradeContractAddress: UPGRADE_ADDRESS,
  });
  mockEstimateGas.mockResolvedValue({
    gas: '0x5208',
    simulationFails: undefined,
  });
  mockEstimateGasFee.mockResolvedValue({
    estimates: FEE_MARKET_ESTIMATES,
  });
  mockGetLayer1GasFee.mockResolvedValue(undefined);
  mockFetchGasFeeEstimates.mockResolvedValue({
    gasFeeEstimates: {
      estimatedBaseFee: '10',
    },
  } as never);
}

describe('useEIP7702UpgradeFee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectSourceWalletAddress.mockReturnValue(ADDRESS);
    mockSelectSourceToken.mockReturnValue({
      address: '0x0000000000000000000000000000000000000000',
      chainId: NETWORK.chainId as Hex,
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    });
    mockSelectNetworkConfigurations.mockReturnValue({
      [NETWORK.chainId]: NETWORK,
    });
    mockCheckNetworkAndAccountSupports1559.mockReturnValue(true);
    mockSelectConversionRate.mockReturnValue(2000);
    mockSelectShowFiatInTestnets.mockReturnValue(false);
    mockUseFiatFormatter.mockReturnValue(
      (amount: BigNumber) => `$${amount.toFixed(2)}`,
    );
    arrangeSuccessfulEstimate();
  });

  it('estimates the manual upgrade transaction shape', async () => {
    renderHookWithProvider(() => useEIP7702UpgradeFee(), {});

    await waitFor(() => {
      expect(mockEstimateGas).toHaveBeenCalledWith(
        {
          authorizationList: [{ address: UPGRADE_ADDRESS }],
          from: ADDRESS,
          to: ADDRESS,
          type: TransactionEnvelopeType.setCode,
        },
        'mainnet',
      );
      expect(mockEstimateGasFee).toHaveBeenCalledWith({
        transactionParams: {
          authorizationList: [{ address: UPGRADE_ADDRESS }],
          from: ADDRESS,
          to: ADDRESS,
          type: TransactionEnvelopeType.setCode,
        },
        chainId: NETWORK.chainId,
        networkClientId: 'mainnet',
      });
      expect(mockGetLayer1GasFee).toHaveBeenCalledWith({
        transactionParams: {
          authorizationList: [{ address: UPGRADE_ADDRESS }],
          from: ADDRESS,
          to: ADDRESS,
          type: TransactionEnvelopeType.setCode,
          gas: '0x5208',
        },
        chainId: NETWORK.chainId,
        networkClientId: 'mainnet',
      });
    });
  });

  it('passes the estimated gas into the layer 1 fee request', async () => {
    mockEstimateGas.mockResolvedValue({
      gas: '0xabc',
      simulationFails: undefined,
    });

    renderHookWithProvider(() => useEIP7702UpgradeFee(), {});

    await waitFor(() => {
      expect(mockGetLayer1GasFee).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionParams: expect.objectContaining({ gas: '0xabc' }),
        }),
      );
    });
  });

  it('formats an EIP-1559 estimate in fiat', async () => {
    const { result } = renderHookWithProvider(() => useEIP7702UpgradeFee(), {});

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        displayFee: '$0.50',
        preciseNativeFeeInHex: '0xe531527bc000',
      });
    });
  });

  it('includes the layer 1 fee', async () => {
    mockGetLayer1GasFee.mockResolvedValue('0x5af3107a4000');
    const { result } = renderHookWithProvider(() => useEIP7702UpgradeFee(), {});

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        displayFee: '$0.70',
        preciseNativeFeeInHex: '0x1402462f60000',
      });
    });
  });

  it('formats a legacy gas estimate', async () => {
    mockCheckNetworkAndAccountSupports1559.mockReturnValue(false);
    mockEstimateGasFee.mockResolvedValue({
      estimates: {
        type: GasFeeEstimateType.Legacy,
        [GasFeeEstimateLevel.Low]: '0x2540be400',
        [GasFeeEstimateLevel.Medium]: '0x2540be400',
        [GasFeeEstimateLevel.High]: '0x2540be400',
      },
    });
    const { result } = renderHookWithProvider(() => useEIP7702UpgradeFee(), {});

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        displayFee: '$0.42',
        preciseNativeFeeInHex: '0xbefe6f672000',
      });
    });
  });

  it('falls back to the native fee without a conversion rate', async () => {
    mockSelectConversionRate.mockReturnValue(undefined);
    const { result } = renderHookWithProvider(() => useEIP7702UpgradeFee(), {});

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        displayFee: '0.0003',
        preciseNativeFeeInHex: '0xe531527bc000',
      });
    });
  });

  it('returns not-required without estimating for an upgraded account', async () => {
    mockGetUpgradeStatus.mockResolvedValue({ isUpgradeRequired: false });
    const { result } = renderHookWithProvider(() => useEIP7702UpgradeFee(), {});

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'not-required' });
    });
    expect(mockEstimateGas).not.toHaveBeenCalled();
    expect(mockEstimateGasFee).not.toHaveBeenCalled();
  });

  it('returns error when estimation fails', async () => {
    mockEstimateGas.mockRejectedValue(new Error('Estimation failed'));
    const { result } = renderHookWithProvider(() => useEIP7702UpgradeFee(), {});

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'error' });
    });
  });

  it('returns error without estimating when the account is unsupported', async () => {
    mockGetUpgradeStatus.mockRejectedValue(
      new Error('Account does not support EIP-7702'),
    );
    const { result } = renderHookWithProvider(() => useEIP7702UpgradeFee(), {});

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'error' });
    });
    expect(mockEstimateGas).not.toHaveBeenCalled();
  });

  it('stops estimation when the hook unmounts', async () => {
    let resolveFirstStatus:
      | ((
          value: Awaited<ReturnType<typeof getEIP7702AccountUpgradeStatus>>,
        ) => void)
      | undefined;
    mockGetUpgradeStatus.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirstStatus = resolve;
      }),
    );
    const { unmount } = renderHookWithProvider(
      () => useEIP7702UpgradeFee(),
      {},
    );

    unmount();

    await act(async () => {
      resolveFirstStatus?.({
        isUpgradeRequired: true,
        address: ADDRESS,
        upgradeContractAddress: UPGRADE_ADDRESS,
      });
    });

    expect(mockEstimateGas).not.toHaveBeenCalled();
  });
});
