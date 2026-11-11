import {
  GasFeeEstimateType,
  TransactionStatus,
  TransactionType,
  type GasFeeEstimates,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { renderHook } from '@testing-library/react-native';

import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import {
  useConfirmationContext,
  type ConfirmationContextParams,
} from '../../context/confirmation-context';
import { Severity } from '../../types/alerts';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useSuggestedGasFeeHighAlert } from './useSuggestedGasFeeHighAlert';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../gas/useIsGaslessSupported');
jest.mock('../../context/confirmation-context');

const GWEI_70 = '0x104c533c00';
const GWEI_80 = '0x12a05f2000';
const GWEI_84 = '0x138eca4800';
const GWEI_84_MINUS_ONE_WEI = '0x138eca47ff';
const GWEI_100 = '0x174876e800';
const GWEI_2 = '0x77359400';

const FEE_MARKET_ESTIMATES = {
  type: GasFeeEstimateType.FeeMarket,
  low: { maxFeePerGas: '0x1', maxPriorityFeePerGas: '0x1' },
  medium: { maxFeePerGas: GWEI_70, maxPriorityFeePerGas: GWEI_2 },
  high: { maxFeePerGas: GWEI_100, maxPriorityFeePerGas: GWEI_2 },
} as GasFeeEstimates;

const LEGACY_ESTIMATES = {
  type: GasFeeEstimateType.Legacy,
  low: '0x1',
  medium: GWEI_70,
  high: GWEI_100,
} as GasFeeEstimates;

const GAS_PRICE_ESTIMATES = {
  type: GasFeeEstimateType.GasPrice,
  gasPrice: GWEI_70,
} as GasFeeEstimates;

function buildEip1559Transaction(
  dappMaxFeePerGas: string,
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta {
  return {
    id: 'tx-1',
    chainId: '0x1',
    status: TransactionStatus.unapproved,
    type: TransactionType.contractInteraction,
    origin: 'https://example.com',
    dappSuggestedGasFees: {
      maxFeePerGas: dappMaxFeePerGas,
      maxPriorityFeePerGas: GWEI_2,
    },
    txParams: {
      from: '0x1234567890123456789012345678901234567890',
      maxFeePerGas: dappMaxFeePerGas,
      maxPriorityFeePerGas: GWEI_2,
    },
    gasFeeEstimates: FEE_MARKET_ESTIMATES,
    ...overrides,
  } as unknown as TransactionMeta;
}

function buildLegacyTransaction(
  dappGasPrice: string,
  gasFeeEstimates: GasFeeEstimates,
): TransactionMeta {
  return {
    id: 'tx-2',
    chainId: '0x38',
    status: TransactionStatus.unapproved,
    type: TransactionType.contractInteraction,
    origin: 'https://example.com',
    dappSuggestedGasFees: { gasPrice: dappGasPrice },
    txParams: {
      from: '0x1234567890123456789012345678901234567890',
      gasPrice: dappGasPrice,
    },
    gasFeeEstimates,
  } as unknown as TransactionMeta;
}

describe('useSuggestedGasFeeHighAlert', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseIsGaslessSupported = jest.mocked(useIsGaslessSupported);
  const mockUseConfirmationContext = jest.mocked(useConfirmationContext);
  const mockSetIsGasFeeModalVisible = jest.fn();

  function runHook(transactionMeta: TransactionMeta | undefined) {
    mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);
    return renderHook(() => useSuggestedGasFeeHighAlert()).result.current;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseIsGaslessSupported.mockReturnValue({
      isSupported: false,
      isSmartTransaction: false,
      pending: false,
    });
    mockUseConfirmationContext.mockReturnValue({
      setIsGasFeeModalVisible: mockSetIsGasFeeModalVisible,
    } as unknown as ConfirmationContextParams);
  });

  it('returns warning alert with edit action when dapp fee is at least 20% higher', () => {
    const alerts = runHook(buildEip1559Transaction(GWEI_100));

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toEqual({
      action: {
        label: 'Edit network fee',
        callback: expect.any(Function),
      },
      field: RowAlertKey.EstimatedFee,
      isBlocking: false,
      key: AlertKeys.SuggestedGasFeeHigh,
      message:
        'This site is suggesting a higher network fee than necessary. Edit the network fee to pay less.',
      severity: Severity.Warning,
      title: 'High site fee',
    });
  });

  it('opens gas fee modal when action callback is called', () => {
    const alerts = runHook(buildEip1559Transaction(GWEI_100));

    alerts[0].action?.callback();

    expect(mockSetIsGasFeeModalVisible).toHaveBeenCalledWith(true);
  });

  it('returns alert when dapp fee is exactly 20% higher', () => {
    const alerts = runHook(buildEip1559Transaction(GWEI_84));

    expect(alerts.map(({ key }) => key)).toEqual([
      AlertKeys.SuggestedGasFeeHigh,
    ]);
  });

  it('returns no alerts when dapp fee is 1 wei below 20% higher', () => {
    expect(runHook(buildEip1559Transaction(GWEI_84_MINUS_ONE_WEI))).toEqual([]);
  });

  it('returns no alerts when dapp fee is within 20% of market fee', () => {
    expect(runHook(buildEip1559Transaction(GWEI_80))).toEqual([]);
  });

  it('returns alert for legacy estimates when dapp gas price is high', () => {
    const alerts = runHook(buildLegacyTransaction(GWEI_100, LEGACY_ESTIMATES));

    expect(alerts.map(({ key }) => key)).toEqual([
      AlertKeys.SuggestedGasFeeHigh,
    ]);
  });

  it('returns alert for gas price estimates when dapp gas price is high', () => {
    const alerts = runHook(
      buildLegacyTransaction(GWEI_100, GAS_PRICE_ESTIMATES),
    );

    expect(alerts.map(({ key }) => key)).toEqual([
      AlertKeys.SuggestedGasFeeHigh,
    ]);
  });

  it('returns alert when dapp gas price was converted to EIP-1559 fees', () => {
    const alerts = runHook(
      buildEip1559Transaction(GWEI_100, {
        dappSuggestedGasFees: { gasPrice: GWEI_100 },
        txParams: {
          from: '0x1234567890123456789012345678901234567890',
          maxFeePerGas: GWEI_100,
          maxPriorityFeePerGas: GWEI_100,
        },
      }),
    );

    expect(alerts.map(({ key }) => key)).toEqual([
      AlertKeys.SuggestedGasFeeHigh,
    ]);
  });

  it('returns alert when dapp gas price is high against fee market estimates', () => {
    const alerts = runHook(
      buildLegacyTransaction(GWEI_100, FEE_MARKET_ESTIMATES),
    );

    expect(alerts.map(({ key }) => key)).toEqual([
      AlertKeys.SuggestedGasFeeHigh,
    ]);
  });

  it('returns no alerts when native token is selected as gas fee token', () => {
    expect(
      runHook(
        buildEip1559Transaction(GWEI_100, {
          selectedGasFeeToken: NATIVE_TOKEN_ADDRESS,
        }),
      ),
    ).toEqual([]);
  });

  it('returns no alerts for MetaMask origin', () => {
    expect(
      runHook(buildEip1559Transaction(GWEI_100, { origin: MMM_ORIGIN })),
    ).toEqual([]);
  });

  it.each([
    ['legacy', LEGACY_ESTIMATES],
    ['gas price', GAS_PRICE_ESTIMATES],
  ])(
    'returns no alerts when dapp max fee is compared to %s estimates',
    (_name, gasFeeEstimates) => {
      expect(
        runHook(buildEip1559Transaction(GWEI_100, { gasFeeEstimates })),
      ).toEqual([]);
    },
  );

  it('returns no alerts when transaction metadata is undefined', () => {
    expect(runHook(undefined)).toEqual([]);
  });

  it('returns no alerts when dapp did not suggest gas fees', () => {
    expect(
      runHook(
        buildEip1559Transaction(GWEI_100, { dappSuggestedGasFees: undefined }),
      ),
    ).toEqual([]);
  });

  it('returns no alerts when user edited the gas fees', () => {
    expect(
      runHook(
        buildEip1559Transaction(GWEI_100, {
          txParams: {
            from: '0x1234567890123456789012345678901234567890',
            maxFeePerGas: GWEI_70,
            maxPriorityFeePerGas: GWEI_2,
          },
        }),
      ),
    ).toEqual([]);
  });

  it('returns no alerts when only the priority fee was edited', () => {
    expect(
      runHook(
        buildEip1559Transaction(GWEI_100, {
          txParams: {
            from: '0x1234567890123456789012345678901234567890',
            maxFeePerGas: GWEI_100,
            maxPriorityFeePerGas: GWEI_70,
          },
        }),
      ),
    ).toEqual([]);
  });

  it('returns no alerts when paying gas with a non-native token', () => {
    expect(
      runHook(
        buildEip1559Transaction(GWEI_100, {
          selectedGasFeeToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        }),
      ),
    ).toEqual([]);
  });

  it('returns no alerts when gas fee is sponsored', () => {
    mockUseIsGaslessSupported.mockReturnValue({
      isSupported: true,
      isSmartTransaction: true,
      pending: false,
    });

    expect(
      runHook(buildEip1559Transaction(GWEI_100, { isGasFeeSponsored: true })),
    ).toEqual([]);
  });

  it('returns no alerts while the gasless support check is pending', () => {
    mockUseIsGaslessSupported.mockReturnValue({
      isSupported: false,
      isSmartTransaction: false,
      pending: true,
    });

    expect(
      runHook(buildEip1559Transaction(GWEI_100, { isGasFeeSponsored: true })),
    ).toEqual([]);
  });

  it('returns no alerts when gas fee estimates are missing', () => {
    expect(
      runHook(
        buildEip1559Transaction(GWEI_100, { gasFeeEstimates: undefined }),
      ),
    ).toEqual([]);
  });

  it('returns no alerts when market fee estimate is missing', () => {
    expect(
      runHook(
        buildEip1559Transaction(GWEI_100, {
          gasFeeEstimates: {
            type: GasFeeEstimateType.FeeMarket,
          } as GasFeeEstimates,
        }),
      ),
    ).toEqual([]);
  });

  it('returns no alerts when market fee estimate is zero', () => {
    expect(
      runHook(
        buildLegacyTransaction(GWEI_100, {
          type: GasFeeEstimateType.GasPrice,
          gasPrice: '0x0',
        } as GasFeeEstimates),
      ),
    ).toEqual([]);
  });
});
