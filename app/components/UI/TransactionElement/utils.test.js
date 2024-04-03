import { decodeIncomingTransfer } from './utils';
describe('decodeIncomingTransfer', () => {
  it('should decode an incoming transfer', () => {
    // Arrange
    const args = {
      tx: {
        txParams: {
          to: '0x77648f1407986479fb1fa5cc3597084b5dbdb057',
          from: '0x1440ec793ae50fa046b95bfeca5af475b6003f9e',
          value: '52daf0',
        },
        transferInformation: {
          symbol: 'USDT',
          decimals: 6,
          contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        },
        hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
      },
      currentCurrency: 'usd',
      contractExchangeRates: {},
      totalGas: '0x64',
      actionKey: 'key',
      primaryCurrency: 'ETH',
      selectedAddress: '0x77648f1407986479fb1fa5cc3597084b5dbdb057',
      ticker: 'ETH',
    };

    // Act
    const [transactionElement, transactionDetails] =
      decodeIncomingTransfer(args);

    // Assert
    expect(transactionElement).toEqual({
      actionKey: 'key',
      renderFrom: '0x1440ec793aE50fA046B95bFeCa5aF475b6003f9e',
      renderTo: '0x77648F1407986479fb1fA5Cc3597084B5dbDB057',
      value: '5.43 USDT',
      fiatValue: undefined,
      isIncomingTransfer: true,
      transactionType: 'transaction_received_token',
    });
    expect(transactionDetails).toEqual({
      renderTotalGas: '< 0.00001 ETH',
      renderValue: '5.43 USDT',
      renderFrom: '0x1440ec793aE50fA046B95bFeCa5aF475b6003f9e',
      renderTo: '0x77648F1407986479fb1fA5Cc3597084B5dbDB057',
      hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
      transactionType: 'transaction_received_token',
      summaryAmount: '5.43 USDT',
      summaryFee: '< 0.00001 ETH',
      summaryTotalAmount: '5.43 USDT / < 0.00001 ETH',
      summarySecondaryTotalAmount: undefined,
    });
  });

  it('should decode an incoming transfer with big number with 10 digits', () => {
    // Arrange
    const args = {
      tx: {
        txParams: {
          to: '0x77648f1407986479fb1fa5cc3597084b5dbdb057',
          from: '0x1440ec793ae50fa046b95bfeca5af475b6003f9e',
          value: '3B9ACA00', // 1000000000 in decimal
        },
        transferInformation: {
          symbol: 'USDT',
          decimals: 6,
          contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        },
        hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
      },
      currentCurrency: 'usd',
      contractExchangeRates: {},
      totalGas: '0x64',
      actionKey: 'key',
      primaryCurrency: 'ETH',
      selectedAddress: '0x77648f1407986479fb1fa5cc3597084b5dbdb057',
      ticker: 'ETH',
    };

    // Act
    const [transactionElement, transactionDetails] =
      decodeIncomingTransfer(args);

    // Assert
    expect(transactionElement).toEqual({
      actionKey: 'key',
      renderFrom: '0x1440ec793aE50fA046B95bFeCa5aF475b6003f9e',
      renderTo: '0x77648F1407986479fb1fA5Cc3597084B5dbDB057',
      value: '1000 USDT',
      fiatValue: undefined,
      isIncomingTransfer: true,
      transactionType: 'transaction_received_token',
    });
    expect(transactionDetails).toEqual({
      renderTotalGas: '< 0.00001 ETH',
      renderValue: '1000 USDT',
      renderFrom: '0x1440ec793aE50fA046B95bFeCa5aF475b6003f9e',
      renderTo: '0x77648F1407986479fb1fA5Cc3597084B5dbDB057',
      hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
      transactionType: 'transaction_received_token',
      summaryAmount: '1000 USDT',
      summaryFee: '< 0.00001 ETH',
      summaryTotalAmount: '1000 USDT / < 0.00001 ETH',
      summarySecondaryTotalAmount: undefined,
    });
  });
});
