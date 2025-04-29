import {
  CONTRACT_CREATION_SIGNATURE,
  TRANSACTION_TYPES,
} from '../../../util/transactions';
import decodeTransaction, { decodeIncomingTransfer } from './utils';

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      getQRKeyringState: async () => ({ subscribe: () => ({}) }),
    },
    TokenListController: {
      state: {
        tokenList: {
          '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': {
            address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
            symbol: 'SNX',
            decimals: 18,
            name: 'Synthetix Network Token',
            iconUrl:
              'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f.png',
            type: 'erc20',
            aggregators: [
              'Aave',
              'Bancor',
              'CMC',
              'Crypto.com',
              'CoinGecko',
              '1inch',
              'PMM',
              'Synthetix',
              'Zerion',
              'Lifi',
            ],
            occurrences: 10,
            fees: {
              '0x5fd79d46eba7f351fe49bff9e87cdea6c821ef9f': 0,
              '0xda4ef8520b1a57d7d63f1e249606d1a459698876': 0,
            },
          },
        },
      },
      tokensChainsCache: {},
      preventPollingOnNetworkRestart: false,
    },
  },
}));

describe('Utils', () => {
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
        txChainId: '0x1',
        networkConfigurationsByChainId: {
          '0x1': {
            nativeCurrency: 'ETH',
          },
        },
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
        txChainId: '0x1',
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
        txChainId: '0x1',
        networkConfigurationsByChainId: {
          '0x1': {
            nativeCurrency: 'ETH',
          },
        },
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
        txChainId: '0x1',
      });
    });
  });

  describe('decodeTransaction', () => {
    const expectedTransactionDetails = {
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      renderFrom: '0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD',
      renderGas: '21000',
      renderGasPrice: 1,
      renderTo: '0x1234567890AbcdEF1234567890aBcdef12345678',
      renderTotalGas: '0.00002 ETH',
      renderValue: '0 ETH',
      summaryAmount: '0 ETH',
      summaryFee: '0.00002 ETH',
      summarySecondaryTotalAmount: undefined,
      summaryTotalAmount: '0.00002 ETH',
      txChainId: '0x1',
    };

    const txParamsMock = {
      to: '0x1234567890abcdef1234567890abcdef12345678',
      from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      value: '0',
      data: '0xa22cb4650000000000000000000000000000000000000000000000000000000000000001',
      gas: '0x5208',
      gasPrice: '0x3b9aca00',
    };

    it('decodes a transaction with type set approval for all', async () => {
      const args = {
        tx: {
          txParams: txParamsMock,
          transactionType: TRANSACTION_TYPES.SET_APPROVAL_FOR_ALL,
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        },
        currentCurrency: 'usd',
        contractExchangeRates: {},
        totalGas: '0x5208',
        actionKey: 'transactions.set_approval_for_all',
        primaryCurrency: 'ETH',
        selectedAddress: '0x1234567890abcdef1234567890abcdef12345678',
        ticker: 'ETH',
        txChainId: '0x1',
        networkConfigurationsByChainId: {
          '0x1': {
            nativeCurrency: 'ETH',
          },
        },
      };

      const result = await decodeTransaction(args);

      expect(result).toEqual([
        {
          actionKey: 'Set Approval For All',
          fiatValue: undefined,
          renderFrom: '0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD',
          renderTo: '0x1234567890AbcdEF1234567890aBcdef12345678',
          transactionType: 'transaction_set_approval_for_all',
          value: '0 ETH',
        },
        {
          ...expectedTransactionDetails,
          transactionType: 'transaction_set_approval_for_all',
        },
      ]);
    });

    it('decodes a transaction with type increase allowance', async () => {
      const args = {
        tx: {
          txParams: {
            ...txParamsMock,
            data: '0x39509351',
          },
          transactionType: TRANSACTION_TYPES.INCREASE_ALLOWANCE,
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        },
        currentCurrency: 'usd',
        contractExchangeRates: {},
        totalGas: '0x5208',
        actionKey: 'transactions.increase_allowance',
        primaryCurrency: 'ETH',
        selectedAddress: '0x1234567890abcdef1234567890abcdef12345678',
        ticker: 'ETH',
        txChainId: '0x1',
        networkConfigurationsByChainId: {
          '0x1': {
            nativeCurrency: 'ETH',
          },
        },
      };

      const result = await decodeTransaction(args);

      expect(result).toEqual([
        {
          actionKey: 'Increase Allowance',
          fiatValue: undefined,
          renderFrom: '0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD',
          renderTo: '0x1234567890AbcdEF1234567890aBcdef12345678',
          transactionType: 'transaction_increase_allowance',
          value: '0 ETH',
        },
        {
          ...expectedTransactionDetails,
          transactionType: 'transaction_increase_allowance',
        },
      ]);
    });

    it('decodes a transaction with type contract interactions', async () => {
      const args = {
        tx: {
          txParams: {
            ...txParamsMock,
            data: CONTRACT_CREATION_SIGNATURE,
          },
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        },
        currentCurrency: 'usd',
        contractExchangeRates: {},
        totalGas: '0x5208',
        actionKey: 'transactions.swaps_transaction',
        primaryCurrency: 'ETH',
        selectedAddress: '0x1234567890abcdef1234567890abcdef12345678',
        ticker: 'ETH',
        txChainId: '0x1',
        networkConfigurationsByChainId: {
          '0x1': {
            nativeCurrency: 'ETH',
          },
        },
      };

      const result = await decodeTransaction(args);

      expect(result).toEqual([
        {
          actionKey: 'Contract Deployment',
          fiatValue: undefined,
          contractDeployment: true,
          renderFrom: '0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD',
          renderTo: 'New Contract',
          transactionType: 'transaction_site_interaction',
          value: '0.00002 ETH',
        },
        {
          ...expectedTransactionDetails,
          renderTo: 'New Contract',
        },
      ]);
    });
  });
});
