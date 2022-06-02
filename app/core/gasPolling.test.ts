jest.useFakeTimers();
import { getEIP1559TransactionData, startGasPolling } from './gasPolling';

const mock = jest.fn();

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
    logo: '../images/eth-logo.png',
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
  const mockFn = jest.fn();
  it('should call the start gas polling', () => {
    mockFn.mockImplementation(startGasPolling);
    mockFn(token);
    expect(mockFn).toHaveBeenCalled();
  });

  it('should return a token value when called', async () => {
    mockFn.mockImplementation(startGasPolling);
    mockFn(token);
    const tokenValue = 'fba4a030-e1f5-11ec-a660-87ece4ac6cf4';
    const asyncMock = mockFn.mockResolvedValue(tokenValue);
    const pollToken = await asyncMock();
    expect(pollToken).toEqual(tokenValue);
  });
});

describe('GetEIP1559TransactionData', () => {
  it('should get the transaction data for EIP1559', () => {
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
      totalMinNative: '1.00005',
    };

    mock.mockImplementation(getEIP1559TransactionData);
    const result = mock(transactionData);
    expect(result).toEqual(expected);
  });

  it('check that getEIP1559TransactionData is called', () => {
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

    mock.mockImplementation(getEIP1559TransactionData);
    mock(transactionData);
    expect(mock).toHaveBeenCalled();
  });
});
