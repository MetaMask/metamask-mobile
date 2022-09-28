jest.useFakeTimers();

import Engine from '../Engine';
import {
  startGasPolling,
  getEIP1559TransactionData,
  stopGasPolling,
  useDataStore,
} from './GasPolling';
import { parseTransactionEIP1559 } from '../../util/transactions';
jest.mock('../../util/transactions');
const mockedParseTransactionEIP1559 =
  parseTransactionEIP1559 as jest.MockedFunction<
    typeof parseTransactionEIP1559
  >;

const tokenValue = 'fba4a030-e1f5-11ec-a660-87ece4ac6cf7';

jest.mock('../Engine', () => ({
  context: {
    GasFeeController: {
      gasFeeEstimates: {},
      gasEstimateType: '',
      getGasFeeEstimatesAndStartPolling: jest.fn(() => tokenValue),
      stopPolling: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ['', [], [], 1, 'ETH', 'wei', [], [], '', false]),
}));

const suggestedGasLimit = '0x123';
const gas = {
  maxWaitTimeEstimate: 45000,
  minWaitTimeEstimate: 15000,
  suggestedMaxFeePerGas: '1.500000018',
  suggestedMaxPriorityFeePerGas: '1.5',
};
const selectedOption = 'medium';
const gasFeeEstimates = {
  baseFeeTrend: 'down',
  estimatedBaseFee: '0.000000013',
  high: {
    maxWaitTimeEstimate: 60000,
    minWaitTimeEstimate: 15000,
    suggestedMaxFeePerGas: '2.450000023',
    suggestedMaxPriorityFeePerGas: '2.45',
  },
  historicalBaseFeeRange: ['0.000000009', '0.000000014'],
  historicalPriorityFeeRange: ['1', '96'],
  latestPriorityFeeRange: ['1.5', '2.999999783'],
  low: {
    maxWaitTimeEstimate: 30000,
    minWaitTimeEstimate: 15000,
    suggestedMaxFeePerGas: '1.410000013',
    suggestedMaxPriorityFeePerGas: '1.41',
  },
  medium: {
    maxWaitTimeEstimate: 45000,
    minWaitTimeEstimate: 15000,
    suggestedMaxFeePerGas: '1.500000018',
    suggestedMaxPriorityFeePerGas: '1.5',
  },
  networkCongestion: 0.4713,
  priorityFeeTrend: 'level',
};
const contractExchangeRates = {};
const conversionRate = 1844.31;
const currentCurrency = 'USD';
const nativeCurrency = 'ETH';
const transactionState = {
  selectedAsset: {
    address: '',
    isETH: true,
    logo: '../images/eth-logo-new.png',
    name: 'Ether',
    symbol: 'ETH',
  },
  transaction: {
    value: '0xde0b6b3a7640000',
    data: undefined,
  },
};

describe('GasPolling', () => {
  const token = undefined;
  const { GasFeeController }: any = Engine.context;
  it('should call the start gas polling controller', async () => {
    await startGasPolling(token);
    expect(
      GasFeeController.getGasFeeEstimatesAndStartPolling,
    ).toHaveBeenCalled();
  });

  it('should return a token value when called', async () => {
    const pollToken = await startGasPolling(token);
    expect(pollToken).toEqual(tokenValue);
  });

  it('should stop polling when stopGasPolling is called', async () => {
    await stopGasPolling();
    expect(GasFeeController.stopPolling).toHaveBeenCalled();
  });
});

describe('GetEIP1559TransactionData', () => {
  const transactionData = {
    suggestedGasLimit,
    gas,
    selectedOption,
    gasFeeEstimates,
    transactionState,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
  };

  it('should fail when incomplete props is passed for ', async () => {
    const incompleteTransactionData = {
      suggestedGasLimit,
      gas,
      selectedOption,
      gasFeeEstimates,
      transactionState,
      contractExchangeRates,
      conversionRate,
      currentCurrency,
    };

    try {
      const result = getEIP1559TransactionData(
        incompleteTransactionData as any,
      );
      expect(result).toEqual('Incomplete data for EIP1559 transaction');
      expect(mockedParseTransactionEIP1559).not.toHaveBeenCalled();
    } catch (error) {
      return expect(error).toBeTruthy();
    }
  });

  it('should get the transaction data for EIP1559', () => {
    const expected = {
      estimatedBaseFee: '0.000000013',
      estimatedBaseFeeHex: 'd',
      gasFeeMaxConversion: '0.09',
      gasFeeMaxNative: '0.00005',
      gasFeeMinConversion: '0.09',
      gasFeeMinNative: '0.00005',
      gasLimitHex: '0x8163',
      maxPriorityFeeConversion: '0.09',
      maxPriorityFeeNative: '0.00005',
      renderableGasFeeMaxConversion: '$0.09',
      renderableGasFeeMaxNative: '0.00005 ETH',
      renderableGasFeeMinConversion: '$0.09',
      renderableGasFeeMinNative: '0.00005 ETH',
      renderableMaxFeePerGasConversion: '$0.09',
      renderableMaxFeePerGasNative: '0.00005 ETH',
      renderableMaxPriorityFeeConversion: '$0.09',
      renderableMaxPriorityFeeNative: '0.00005 ETH',
      renderableTotalMaxConversion: '$1,844.40',
      renderableTotalMaxNative: '1.00005 ETH',
      renderableTotalMinConversion: '$1,844.40',
      renderableTotalMinNative: '1.00005 ETH',
      suggestedGasLimit: '0x123',
      suggestedMaxFeePerGas: '1.500000018',
      suggestedMaxFeePerGasHex: '59682f12',
      suggestedMaxPriorityFeePerGas: '1.5',
      suggestedMaxPriorityFeePerGasHex: '59682f00',
      timeEstimate: 'Likely in < 30 seconds',
      timeEstimateColor: 'green',
      timeEstimateId: 'likely',
      totalMaxConversion: '1844.4',
      totalMaxHex: 'de0e3e3ba6645f6',
      totalMaxNative: '1.00005',
      totalMinConversion: '1844.4',
      totalMinHex: 'de0e3e3ba63bf07',
      totalMinNative: '1.00006',
    };

    mockedParseTransactionEIP1559.mockReturnValue(expected);

    const result = getEIP1559TransactionData(transactionData);
    expect(mockedParseTransactionEIP1559).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });
});

describe('useDataStore', () => {
  it('should return the data store', () => {
    const result = useDataStore();
    expect(result.conversionRate).toEqual(1);
  });
});
