import { TransactionType } from '@metamask/transaction-controller';
import {
  CONTRACT_CREATION_SIGNATURE,
  TRANSACTION_TYPES,
} from '../../../util/transactions';
import decodeTransaction from './utils';
import { strings } from '../../../../locales/i18n';

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      getQRKeyringState: async () => ({ subscribe: () => ({}) }),
    },
    TokenListController: {
      state: {
        tokensChainsCache: {
          '0x1': {
            data: [
              {
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
            ],
          },
        },
      },
      preventPollingOnNetworkRestart: false,
    },
  },
}));

const TRANSACTION_DETAILS_MOCK = {
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

const TX_PARAMS_MOCK = {
  to: '0x1234567890abcdef1234567890abcdef12345678',
  from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  value: '0',
  data: '0xa22cb4650000000000000000000000000000000000000000000000000000000000000001',
  gas: '0x5208',
  gasPrice: '0x3b9aca00',
};

describe('Transaction Element Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('decodeTransaction', () => {
    it('if set approval for all', async () => {
      const args = {
        tx: {
          txParams: TX_PARAMS_MOCK,
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
          ...TRANSACTION_DETAILS_MOCK,
          transactionType: 'transaction_set_approval_for_all',
        },
      ]);
    });

    it('if increase allowance', async () => {
      const args = {
        tx: {
          txParams: {
            ...TX_PARAMS_MOCK,
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
          ...TRANSACTION_DETAILS_MOCK,
          transactionType: 'transaction_increase_allowance',
        },
      ]);
    });

    it('if contract interaction', async () => {
      const args = {
        tx: {
          txParams: {
            ...TX_PARAMS_MOCK,
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
          ...TRANSACTION_DETAILS_MOCK,
          renderTo: 'New Contract',
        },
      ]);
    });

    it('if incoming transfer', async () => {
      // Arrange
      const selectedAddress = '0x77648f1407986479fb1fa5cc3597084b5dbdb057';
      const contractAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';
      const args = {
        tx: {
          txParams: {
            to: contractAddress, // Token contract address (not recipient)
            from: '0x1440ec793ae50fa046b95bfeca5af475b6003f9e',
            value: '52daf0',
          },
          transferInformation: {
            symbol: 'USDT',
            decimals: 6,
            contractAddress,
          },
          hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
          isTransfer: true,
          toSmartContract: false,
        },
        currentCurrency: 'usd',
        contractExchangeRates: {},
        totalGas: '0x64',
        actionKey: 'key',
        primaryCurrency: 'ETH',
        selectedAddress,
        ticker: 'ETH',
        txChainId: '0x1',
      };

      // Act
      const [transactionElement, transactionDetails] =
        await decodeTransaction(args);

      // Assert
      expect(transactionElement).toEqual({
        actionKey: 'Received USDT',
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

    it('if large value', async () => {
      // Arrange
      const selectedAddress = '0x77648f1407986479fb1fa5cc3597084b5dbdb057';
      const contractAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';
      const args = {
        tx: {
          txParams: {
            to: contractAddress, // Token contract address (not recipient)
            from: '0x1440ec793ae50fa046b95bfeca5af475b6003f9e',
            value: '3B9ACA00', // 1000000000 in decimal
          },
          transferInformation: {
            symbol: 'USDT',
            decimals: 6,
            contractAddress,
          },
          hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
          isTransfer: true,
          toSmartContract: false,
        },
        currentCurrency: 'usd',
        contractExchangeRates: {},
        totalGas: '0x64',
        actionKey: 'key',
        primaryCurrency: 'ETH',
        selectedAddress,
        ticker: 'ETH',
        txChainId: '0x1',
      };

      // Act
      const [transactionElement, transactionDetails] =
        await decodeTransaction(args);

      // Assert
      expect(transactionElement).toEqual({
        actionKey: 'Received USDT',
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

    it('if token transfer with alternate ticker', async () => {
      const args = {
        tx: {
          txParams: {
            to: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
            from: '0x1440ec793ae50fa046b95bfeca5af475b6003f9e',
            value: '52daf0',
            data: '0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef1234567800000000000000000000000000000000000000000000000000000000052daf0',
            gas: '0x12345',
            maxFeePerGas: '0x123456789',
            maxPriorityFeePerGas: '0x123456789',
            estimatedBaseFee: '0xABCDEF123',
          },
          hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
        },
        currentCurrency: 'usd',
        contractExchangeRates: {},
        totalGas: '0x64',
        actionKey: 'key',
        primaryCurrency: 'ETH',
        selectedAddress: '0x1440ec793ae50fa046b95bfeca5af475b6003f9e',
        ticker: 'POL',
        txChainId: '0x89',
        tokens: {
          '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': {
            symbol: 'USDC',
            decimals: 6,
          },
        },
      };

      const [transactionElement, transactionDetails] =
        await decodeTransaction(args);

      expect(transactionElement).toEqual({
        actionKey: 'Sent USDC',
        renderTo: '0x1234567890abcdef1234567890abcdef12345678',
        value: '5.43 USDC',
        fiatValue: false,
        nonce: undefined,
        transactionType: 'transaction_sent_token',
      });

      expect(transactionDetails).toEqual({
        renderTotalGas: '0.0038 POL',
        renderValue: '5.43 USDC',
        renderFrom: '0x1440ec793aE50fA046B95bFeCa5aF475b6003f9e',
        renderTo: '0x1234567890AbcdEF1234567890aBcdef12345678',
        renderGas: '74565',
        renderGasPrice: 51,
        hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
        summaryAmount: '5.43 USDC',
        summaryFee: '0.0038 POL',
        summaryTotalAmount: '5.43 USDC / 0.0038 POL',
        summarySecondaryTotalAmount: undefined,
        txChainId: '0x89',
      });
    });

    it.each([
      [
        TransactionType.perpsDeposit,
        strings('transactions.tx_review_perps_deposit'),
      ],
      [
        TransactionType.predictDeposit,
        strings('transactions.tx_review_predict_deposit'),
      ],
      [
        TransactionType.predictWithdraw,
        strings('transactions.tx_review_predict_withdraw'),
      ],
    ])('if %s', async (transactionType, title) => {
      const args = {
        tx: {
          txParams: {
            to: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
            from: '0x1440ec793ae50fa046b95bfeca5af475b6003f9e',
            value: '52daf0',
            data: '0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef1234567800000000000000000000000000000000000000000000000000000000052daf0',
            gas: '0x12345',
            maxFeePerGas: '0x123456789',
            maxPriorityFeePerGas: '0x123456789',
            estimatedBaseFee: '0xABCDEF123',
          },
          hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
          type: transactionType,
        },
        currentCurrency: 'usd',
        contractExchangeRates: {
          '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': {
            price: 2.0,
          },
        },
        conversionRate: 2.0,
        totalGas: '0x64',
        actionKey: 'key',
        primaryCurrency: 'ETH',
        selectedAddress: '0x1440ec793ae50fa046b95bfeca5af475b6003f9e',
        ticker: 'POL',
        txChainId: '0x89',
        tokens: {
          '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': {
            address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
            symbol: 'USDC',
            decimals: 6,
          },
        },
      };

      const [transactionElement, transactionDetails] =
        await decodeTransaction(args);

      expect(transactionElement).toEqual({
        actionKey: title,
        renderTo: '0x1234567890abcdef1234567890abcdef12345678',
        value: '5.43 USDC',
        fiatValue: '$21.72',
        nonce: undefined,
        transactionType: 'transaction_sent_token',
      });

      expect(transactionDetails).toEqual({
        renderTotalGas: '0.0038 POL',
        renderValue: '5.43 USDC',
        renderFrom: '0x1440ec793aE50fA046B95bFeCa5aF475b6003f9e',
        renderTo: '0x1234567890AbcdEF1234567890aBcdef12345678',
        renderGas: '74565',
        renderGasPrice: 51,
        hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
        summaryAmount: '5.43 USDC',
        summaryFee: '0.0038 POL',
        summaryTotalAmount: '5.43 USDC / 0.0038 POL',
        summarySecondaryTotalAmount: '$21.73',
        txChainId: '0x89',
      });
    });

    it('sets SENT_COLLECTIBLE type when user is sender', async () => {
      const selectedAddress = '0x1440ec793ae50fa046b95bfeca5af475b6003f9e';
      const args = {
        tx: {
          type: TransactionType.tokenMethodTransferFrom,
          txParams: {
            to: '0x77648f1407986479fb1fa5cc3597084b5dbdb057',
            from: selectedAddress,
            data: '0x23b872dd',
            gas: '0x5208',
          },
          transferInformation: {
            tokenId: '123',
            contractAddress: '0x77648f1407986479fb1fa5cc3597084b5dbdb057',
          },
          hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
        },
        currentCurrency: 'usd',
        conversionRate: 1,
        totalGas: '0x5208',
        actionKey: 'Sent Collectible',
        primaryCurrency: 'ETH',
        selectedAddress,
        ticker: 'ETH',
        txChainId: '0x1',
        collectibleContracts: [],
      };

      const [transactionElement, transactionDetails] =
        await decodeTransaction(args);

      expect(transactionElement.transactionType).toBe(
        TRANSACTION_TYPES.SENT_COLLECTIBLE,
      );
      expect(transactionDetails.transactionType).toBe(
        TRANSACTION_TYPES.SENT_COLLECTIBLE,
      );
    });

    it('sets RECEIVED_COLLECTIBLE type when user is receiver', async () => {
      const selectedAddress = '0x77648f1407986479fb1fa5cc3597084b5dbdb057';
      const senderAddress = '0x1440ec793ae50fa046b95bfeca5af475b6003f9e';
      const contractAddress = '0xabcdef1234567890abcdef1234567890abcdef12';

      // Complete transferFrom data with actual addresses encoded
      const completeData =
        '0x23b872dd' + // transferFrom signature
        '000000000000000000000000' +
        senderAddress.slice(2) + // from (sender)
        '000000000000000000000000' +
        selectedAddress.slice(2) + // to (recipient - the selected address)
        '0000000000000000000000000000000000000000000000000000000000000456'; // tokenId (456 in hex)

      const args = {
        tx: {
          type: TransactionType.tokenMethodTransferFrom,
          txParams: {
            to: contractAddress, // Contract address, not recipient
            from: senderAddress,
            data: completeData, // Complete data with recipient encoded
            gas: '0x5208',
          },
          transferInformation: {
            tokenId: '456',
            contractAddress,
          },
          hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
        },
        currentCurrency: 'usd',
        conversionRate: 1,
        totalGas: '0x5208',
        actionKey: 'Received Collectible',
        primaryCurrency: 'ETH',
        selectedAddress,
        ticker: 'ETH',
        txChainId: '0x1',
        collectibleContracts: [],
      };

      const [transactionElement, transactionDetails] =
        await decodeTransaction(args);

      expect(transactionElement.transactionType).toBe(
        TRANSACTION_TYPES.RECEIVED_COLLECTIBLE,
      );
      expect(transactionDetails.transactionType).toBe(
        TRANSACTION_TYPES.RECEIVED_COLLECTIBLE,
      );
    });

    it('sets SENT_COLLECTIBLE type with case-insensitive address comparison', async () => {
      const selectedAddress = '0xABCDEF1234567890ABcdef1234567890abcdef12';
      const args = {
        tx: {
          type: TransactionType.tokenMethodTransferFrom,
          txParams: {
            to: '0x77648f1407986479fb1fa5cc3597084b5dbdb057',
            from: '0xabcdef1234567890abcdef1234567890abcdef12',
            data: '0x23b872dd',
            gas: '0x5208',
          },
          transferInformation: {
            tokenId: '789',
            contractAddress: '0x77648f1407986479fb1fa5cc3597084b5dbdb057',
          },
          hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
        },
        currentCurrency: 'usd',
        conversionRate: 1,
        totalGas: '0x5208',
        actionKey: 'Sent Collectible',
        primaryCurrency: 'ETH',
        selectedAddress,
        ticker: 'ETH',
        txChainId: '0x1',
        collectibleContracts: [],
      };

      const [transactionElement] = await decodeTransaction(args);

      expect(transactionElement.transactionType).toBe(
        TRANSACTION_TYPES.SENT_COLLECTIBLE,
      );
    });

    it('decodes recipient from complete data instead of using contract address', async () => {
      const selectedAddress = '0x1440ec793ae50fa046b95bfeca5af475b6003f9e';
      const recipientAddress = '0x99999999999999999999999999999999999999aa';
      const contractAddress = '0x77648f1407986479fb1fa5cc3597084b5dbdb057';

      // Complete transferFrom data with actual addresses encoded
      const completeData =
        '0x23b872dd' + // transferFrom signature
        '000000000000000000000000' +
        selectedAddress.slice(2) + // from
        '000000000000000000000000' +
        recipientAddress.slice(2) + // to (actual recipient)
        '0000000000000000000000000000000000000000000000000000000000000123'; // tokenId

      const args = {
        tx: {
          type: TransactionType.tokenMethodTransferFrom,
          txParams: {
            to: contractAddress, // This is the contract, not the recipient
            from: selectedAddress,
            data: completeData,
            gas: '0x5208',
          },
          transferInformation: {
            tokenId: '291',
            contractAddress,
          },
          hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
        },
        currentCurrency: 'usd',
        conversionRate: 1,
        totalGas: '0x5208',
        actionKey: 'Sent Collectible',
        primaryCurrency: 'ETH',
        selectedAddress,
        ticker: 'ETH',
        txChainId: '0x1',
        collectibleContracts: [],
      };

      const [transactionElement] = await decodeTransaction(args);

      // Should decode recipient from data, not use txParams.to (contract address)
      expect(transactionElement.renderTo).toContain('9999'); // Should show recipient, not contract
      expect(transactionElement.renderTo).not.toContain('7764'); // Should NOT show contract address
      expect(transactionElement.transactionType).toBe(
        TRANSACTION_TYPES.SENT_COLLECTIBLE,
      );
    });

    it('uses transferInformation as fallback when data is truncated', async () => {
      const selectedAddress = '0x1440ec793ae50fa046b95bfeca5af475b6003f9e';
      const contractAddress = '0x77648f1407986479fb1fa5cc3597084b5dbdb057';

      const args = {
        tx: {
          type: TransactionType.tokenMethodTransferFrom,
          txParams: {
            to: contractAddress,
            from: selectedAddress,
            data: '0x23b872dd', // Only function signature - truncated data
            gas: '0x5208',
          },
          transferInformation: {
            tokenId: '456',
            contractAddress,
          },
          hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
        },
        currentCurrency: 'usd',
        conversionRate: 1,
        totalGas: '0x5208',
        actionKey: 'Sent Collectible',
        primaryCurrency: 'ETH',
        selectedAddress,
        ticker: 'ETH',
        txChainId: '0x1',
        collectibleContracts: [],
      };

      const [transactionElement] = await decodeTransaction(args);

      // With truncated data, we fall back to transferInformation
      // Transaction type should still be determined correctly based on txParams.from
      expect(transactionElement.transactionType).toBe(
        TRANSACTION_TYPES.SENT_COLLECTIBLE,
      );
      expect(transactionElement.value).toContain('456'); // Should use tokenId from transferInformation
    });

    it('displays token ID 0 correctly', async () => {
      const selectedAddress = '0x1440ec793ae50fa046b95bfeca5af475b6003f9e';
      const contractAddress = '0x77648f1407986479fb1fa5cc3597084b5dbdb057';
      const args = {
        tx: {
          type: TransactionType.tokenMethodTransferFrom,
          txParams: {
            to: contractAddress,
            from: selectedAddress,
            data: '0x23b872dd',
            gas: '0x5208',
          },
          transferInformation: {
            tokenId: '0',
            contractAddress,
          },
          hash: '0x942d7843454266b81bf631022aa5f3f944691731b62d67c4e80c4bb5740058bb',
        },
        currentCurrency: 'usd',
        conversionRate: 1,
        totalGas: '0x5208',
        actionKey: 'Sent Collectible',
        primaryCurrency: 'ETH',
        selectedAddress,
        ticker: 'ETH',
        txChainId: '0x1',
        collectibleContracts: [
          {
            address: contractAddress,
            name: 'TestNFT',
            symbol: 'TNFT',
          },
        ],
      };

      const [transactionElement] = await decodeTransaction(args);

      expect(transactionElement.value).toContain('#0');
      expect(transactionElement.fiatValue).toBe('TNFT');
    });
  });
});
