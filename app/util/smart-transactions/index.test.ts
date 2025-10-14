import { TransactionMeta } from '@metamask/transaction-controller';
import {
  getShouldStartApprovalRequest,
  getShouldUpdateApprovalRequest,
  getTransactionType,
  getSmartTransactionMetricsProperties,
  getTradeTxTokenFee,
  getGasIncludedTransactionFees,
  type GasIncludedQuote,
  getIsAllowedRpcUrlForSmartTransactions,
  wipeSmartTransactions,
} from './index';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
// eslint-disable-next-line import/no-namespace
import * as environment from '../environment';
import Engine, { type BaseControllerMessenger } from '../../core/Engine';

jest.mock('../../core/Engine', () => ({
  context: {
    SmartTransactionsController: {
      wipeSmartTransactions: jest.fn(),
    },
  },
}));

describe('Smart Transactions utils', () => {
  describe('getTransactionType', () => {
    it('returns correct type type for Send transaction for ETH sends', () => {
      const txMeta = {
        chainId: '0x1',
        deviceConfirmedOn: 'metamask_mobile',
        gasFeeEstimatesLoaded: true,
        id: '52fd9ae0-098f-11ef-949b-c3c3278f64e5',
        networkClientId: 'testNetworkClientId',
        networkID: undefined,
        origin: 'MetaMask Mobile',
        rawTransaction:
          '0x02f87401820295840255f2e185029f3d781e82520894dc738206f559bdae106894a62876a119e470aee2872386f26fc1000080c080a0ce566ea4392e32c0b230fd96ab2e820f70d382921e9dfcaca6e89c893064b4f1a02a8f1dd875c21f959d651557931200ac9855fc8a631e571af507f9c17dd5d27c',
        securityAlertResponse: undefined,
        status: 'signed',
        time: 1714769664910,
        txParams: {
          estimatedBaseFee: '0x1ef7c16d8',
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          gas: '0x5208',
          maxFeePerGas: '0x29f3d781e',
          maxPriorityFeePerGas: '0x255f2e1',
          nonce: '0x295',
          to: '0xdc738206f559bdae106894a62876a119e470aee2',
          value: '0x2386f26fc10000',
        },
        verifiedOnBlockchain: false,
      } as TransactionMeta;

      const chainId = '0x1';
      const res = getTransactionType(txMeta, chainId);
      expect(res).toEqual({
        isDapp: false,
        isSend: true,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
        isNativeTokenTransferred: true,
      });
    });
    it('returns correct type type for Send transaction for ERC20 sends', () => {
      const txMeta = {
        chainId: '0x1',
        deviceConfirmedOn: 'metamask_mobile',
        gasFeeEstimatesLoaded: true,
        id: '07178fe0-0990-11ef-96e6-c3c3278f64e5',
        networkClientId: 'testNetworkClientId',
        networkID: undefined,
        origin: 'MetaMask Mobile',
        rawTransaction:
          '0x02f8b3018202978402e40d2085023139226183010ac494a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4880b844a9059cbb000000000000000000000000dc738206f559bdae106894a62876a119e470aee20000000000000000000000000000000000000000000000000000000000989680c001a0ac69dac75ad910ed54df7e0cc32119111b8e14a05acdfd3a17e02c4cbd7b39d0a02263e6cf6178b38d5dbb9f3a0a912d2cfe838cb54b8804b38f5f0db31e95d785',
        securityAlertResponse: undefined,
        status: 'signed',
        time: 1714769967070,
        txParams: {
          data: '0xa9059cbb000000000000000000000000dc738206f559bdae106894a62876a119e470aee20000000000000000000000000000000000000000000000000000000000989680',
          estimatedBaseFee: '0x19d945b98',
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          gas: '0x10ac4',
          maxFeePerGas: '0x231392261',
          maxPriorityFeePerGas: '0x2e40d20',
          nonce: '0x297',
          to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          value: '0x0',
        },
        verifiedOnBlockchain: false,
      } as TransactionMeta;

      const chainId = '0x1';
      const res = getTransactionType(txMeta, chainId);
      expect(res).toEqual({
        isDapp: false,
        isSend: true,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
        isNativeTokenTransferred: false,
      });
    });
    it('returns correct type type for Dapp transaction for ETH transaction', () => {
      const txMeta = {
        chainId: '0x1',
        deviceConfirmedOn: 'metamask_mobile',
        gasFeeEstimatesLoaded: true,
        id: 'a3551450-098f-11ef-95ae-c3c3278f64e5',
        networkClientId: 'testNetworkClientId',
        networkID: undefined,
        origin: 'app.uniswap.org',
        rawTransaction:
          '0x02f9043a01820296839402a08502811d14d68303739c943fc91a3afd70395cd496c647d5a6cc9d4b2b7fad872386f26fc10000b903c43593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000663551cf00000000000000000000000000000000000000000000000000000000000000040b000604000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000002386f26fc100000000000000000000000000000000000000000000000000000000000001c2b9e700000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb8a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000027213e28d7fda5c57fe9e5dd923818dbccf71c4700000000000000000000000000000000000000000000000000000000000000190000000000000000000000000000000000000000000000000000000000000060000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000001c2b9e7c080a0413913bfa22324d0ed14af0b4f11ecd51628d4b505c353f57e71ae21c76b77bba070931510fd641b12b052ef772681d690b340ab40747a92c5264c4417071b73ee',
        securityAlertResponse: undefined,
        status: 'signed',
        time: 1714769799701,
        txParams: {
          data: '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000663551cf00000000000000000000000000000000000000000000000000000000000000040b000604000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000002386f26fc100000000000000000000000000000000000000000000000000000000000001c2b9e700000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb8a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000027213e28d7fda5c57fe9e5dd923818dbccf71c4700000000000000000000000000000000000000000000000000000000000000190000000000000000000000000000000000000000000000000000000000000060000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000001c2b9e7',
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          gas: '0x3739c',
          maxFeePerGas: '0x2811d14d6',
          maxPriorityFeePerGas: '0x9402a0',
          nonce: '0x296',
          to: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
          value: '0x2386f26fc10000',
        },
        verifiedOnBlockchain: false,
      } as TransactionMeta;

      const chainId = '0x1';
      const res = getTransactionType(txMeta, chainId);
      expect(res).toEqual({
        isDapp: true,
        isSend: false,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
        isNativeTokenTransferred: true,
      });
    });
    it('returns correct type type for Dapp transaction for ERC20 transaction', () => {
      const txMeta = {
        chainId: '0x1',
        deviceConfirmedOn: 'metamask_mobile',
        gasFeeEstimatesLoaded: true,
        id: 'a3551450-098f-11ef-95ae-c3c3278f64e5',
        networkClientId: 'testNetworkClientId',
        networkID: undefined,
        origin: 'app.uniswap.org',
        rawTransaction:
          '0x02f9043a01820296839402a08502811d14d68303739c943fc91a3afd70395cd496c647d5a6cc9d4b2b7fad872386f26fc10000b903c43593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000663551cf00000000000000000000000000000000000000000000000000000000000000040b000604000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000002386f26fc100000000000000000000000000000000000000000000000000000000000001c2b9e700000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb8a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000027213e28d7fda5c57fe9e5dd923818dbccf71c4700000000000000000000000000000000000000000000000000000000000000190000000000000000000000000000000000000000000000000000000000000060000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000001c2b9e7c080a0413913bfa22324d0ed14af0b4f11ecd51628d4b505c353f57e71ae21c76b77bba070931510fd641b12b052ef772681d690b340ab40747a92c5264c4417071b73ee',
        securityAlertResponse: undefined,
        status: 'signed',
        time: 1714769799701,
        txParams: {
          data: '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000663551cf00000000000000000000000000000000000000000000000000000000000000040b000604000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000002386f26fc100000000000000000000000000000000000000000000000000000000000001c2b9e700000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002bc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb8a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000027213e28d7fda5c57fe9e5dd923818dbccf71c4700000000000000000000000000000000000000000000000000000000000000190000000000000000000000000000000000000000000000000000000000000060000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000001c2b9e7',
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          gas: '0x3739c',
          maxFeePerGas: '0x2811d14d6',
          maxPriorityFeePerGas: '0x9402a0',
          nonce: '0x296',
          to: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
          value: '0x0',
        },
        verifiedOnBlockchain: false,
      } as TransactionMeta;

      const chainId = '0x1';
      const res = getTransactionType(txMeta, chainId);
      expect(res).toEqual({
        isDapp: true,
        isSend: false,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
        isNativeTokenTransferred: false,
      });
    });
    it('returns correct type type for Swap transaction for ETH From token', () => {
      const txMeta = {
        chainId: '0x1',
        deviceConfirmedOn: 'metamask_mobile',
        gasFeeEstimatesLoaded: true,
        id: 'b3095a90-0990-11ef-9909-c3c3278f64e5',
        networkClientId: 'testNetworkClientId',
        networkID: undefined,
        origin: 'EXAMPLE_FOX_CODE',
        rawTransaction:
          '0x02f9035d0182029884026a3a6c8502db22e76783035f8994881d40237659c251811cec9c364ef91dc08d300c872386f26fc10000b902e65f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563546656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000023375dc15608000000000000000000000000000000000000000000000000000000000001ccb91d000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000004f94ae6af800000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c80502b1c500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000023375dc15608000000000000000000000000000000000000000000000000000000000001ccb91c0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000180000000000000003b6d0340b4e16d0168e52d35cacd2c6185b44281ec28c9dc7dcbea7c00000000000000000000000000000000000000000000000000f2c080a0115eb0c1a716d4c46df9e672cf12dc6097f73128c636428afb68478566ff09f6a030e854f2beee60a83f9e72b29fd5dbb8cdd64b2bb29751aed0fe6ebbcd72df21',
        securityAlertResponse: undefined,
        status: 'signed',
        time: 1714770255545,
        txParams: {
          data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563546656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000023375dc15608000000000000000000000000000000000000000000000000000000000001ccb91d000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000004f94ae6af800000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c80502b1c500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000023375dc15608000000000000000000000000000000000000000000000000000000000001ccb91c0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000180000000000000003b6d0340b4e16d0168e52d35cacd2c6185b44281ec28c9dc7dcbea7c00000000000000000000000000000000000000000000000000f2',
          estimatedBaseFee: '0x1aca8de39',
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          gas: '0x35f89',
          maxFeePerGas: '0x2db22e767',
          maxPriorityFeePerGas: '0x26a3a6c',
          nonce: '0x298',
          to: '0x881d40237659c251811cec9c364ef91dc08d300c',
          value: '0x2386f26fc10000',
        },
        verifiedOnBlockchain: false,
      } as TransactionMeta;

      const chainId = '0x1';
      const res = getTransactionType(txMeta, chainId);
      expect(res).toEqual({
        isDapp: false,
        isSend: false,
        isInSwapFlow: true,
        isSwapApproveTx: false,
        isSwapTransaction: true,
        isNativeTokenTransferred: true,
      });
    });
    it('returns correct type type for Swap approve transaction for ERC20 From token', () => {
      const txMeta = {
        chainId: '0x1',
        deviceConfirmedOn: 'metamask_mobile',
        gasFeeEstimatesLoaded: true,
        id: '15879650-0991-11ef-9ce4-2f3037ea41a6',
        networkClientId: 'testNetworkClientId',
        networkID: undefined,
        origin: 'EXAMPLE_FOX_CODE',
        rawTransaction:
          '0x02f8b10182029983e35d318502eec2f25d82dd8794a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4880b844095ea7b3000000000000000000000000881d40237659c251811cec9c364ef91dc08d300c000000000000000000000000000000000000000000000000000000001cd7f673c001a07e1721f89a0495b7ea26c58627a757c986bb04b231a2efd649f886046e58cd1fa039ace269764a091bed5780ce8151ba7a2b7973b990df20b9cb9c07f856ed8e69',
        securityAlertResponse: undefined,
        status: 'signed',
        time: 1714770420789,
        txParams: {
          data: '0x095ea7b3000000000000000000000000881d40237659c251811cec9c364ef91dc08d300c000000000000000000000000000000000000000000000000000000001cd7f673',
          estimatedBaseFee: '0x1b91a1b83',
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          gas: '0xdd87',
          maxFeePerGas: '0x2eec2f25d',
          maxPriorityFeePerGas: '0xe35d31',
          nonce: '0x299',
          to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          value: '0x0',
        },
        verifiedOnBlockchain: false,
      } as TransactionMeta;

      const chainId = '0x1';
      const res = getTransactionType(txMeta, chainId);
      expect(res).toEqual({
        isDapp: false,
        isSend: false,
        isInSwapFlow: true,
        isSwapApproveTx: true,
        isSwapTransaction: false,
        isNativeTokenTransferred: false,
      });
    });
    it('returns correct type type for Swap transaction for ERC20 From token', () => {
      const txMeta = {
        chainId: '0x1',
        deviceConfirmedOn: 'metamask_mobile',
        gasFeeEstimatesLoaded: true,
        id: '1587e470-0991-11ef-9ce4-2f3037ea41a6',
        networkClientId: 'testNetworkClientId',
        networkID: undefined,
        origin: 'EXAMPLE_FOX_CODE',
        rawTransaction:
          '0x02f903350182029a83e35d318502eec2f25d8303c00794881d40237659c251811cec9c364ef91dc08d300c80b902c65f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000001cd7f67300000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563546656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001cd7f67300000000000000000000000000000000000000000000000002180c6620b57b9100000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000004d411b4f027f2000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a8e449022e000000000000000000000000000000000000000000000000000000001cd7f673000000000000000000000000000000000000000000000000021cc7bf291179c00000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000120000000000000000000000088e6a0c2ddd26feeb64f039a2c41296fcb3f56407dcbea7c00000000000000000000000000000000000000000000000000b4c080a0b7d69bfdde599cdded9938f194a87057b42854c0f2eb576cfae4ad423e75170aa042676e784692e4920a20cb3dc297e8458bb3e6fe77bcf5341a21ed415a805b3c',
        securityAlertResponse: undefined,
        status: 'signed',
        time: 1714770420791,
        txParams: {
          data: '0x5f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000001cd7f67300000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563546656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001cd7f67300000000000000000000000000000000000000000000000002180c6620b57b9100000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000004d411b4f027f2000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a8e449022e000000000000000000000000000000000000000000000000000000001cd7f673000000000000000000000000000000000000000000000000021cc7bf291179c00000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000120000000000000000000000088e6a0c2ddd26feeb64f039a2c41296fcb3f56407dcbea7c00000000000000000000000000000000000000000000000000b4',
          estimatedBaseFee: '0x1b91a1b83',
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          gas: '0x3c007',
          maxFeePerGas: '0x2eec2f25d',
          maxPriorityFeePerGas: '0xe35d31',
          nonce: '0x29a',
          to: '0x881d40237659c251811cec9c364ef91dc08d300c',
          value: '0x0',
        },
        verifiedOnBlockchain: false,
      } as TransactionMeta;

      const chainId = '0x1';
      const res = getTransactionType(txMeta, chainId);
      expect(res).toEqual({
        isDapp: false,
        isSend: false,
        isInSwapFlow: true,
        isSwapApproveTx: false,
        isSwapTransaction: true,
        isNativeTokenTransferred: false,
      });
    });
  });
  describe('getShouldStartFlow', () => {
    it('returns true for Send transaction', () => {
      const res = getShouldStartApprovalRequest(
        false,
        true,
        false,
        false,
        false,
      );
      expect(res).toBe(true);
    });
    it('returns false for Send transaction when mobileReturnTxHashAsap is true', () => {
      const res = getShouldStartApprovalRequest(
        false,
        true,
        false,
        false,
        true,
      );
      expect(res).toBe(false);
    });
    it('returns true for Dapp transaction', () => {
      const res = getShouldStartApprovalRequest(
        true,
        false,
        false,
        false,
        false,
      );
      expect(res).toBe(true);
    });
    it('returns false for Dapp transaction when mobileReturnTxHashAsap is true', () => {
      const res = getShouldStartApprovalRequest(
        true,
        false,
        false,
        false,
        true,
      );
      expect(res).toBe(false);
    });
    it('returns true for Swap approve transaction', () => {
      const res = getShouldStartApprovalRequest(
        false,
        false,
        true,
        false,
        false,
      );
      expect(res).toBe(true);
    });
    it('returns false for Swap transaction', () => {
      const res = getShouldStartApprovalRequest(
        false,
        false,
        false,
        true,
        false,
      );
      expect(res).toBe(false);
    });
  });
  describe('getShouldUpdateFlow', () => {
    it('returns true for Send transaction', () => {
      const res = getShouldUpdateApprovalRequest(false, true, false, false);
      expect(res).toBe(true);
    });
    it('returns false for Send transaction when mobileReturnTxHashAsap is true', () => {
      const res = getShouldUpdateApprovalRequest(false, true, false, true);
      expect(res).toBe(false);
    });
    it('returns true for Dapp transaction', () => {
      const res = getShouldUpdateApprovalRequest(true, false, false, false);
      expect(res).toBe(true);
    });
    it('returns false for Dapp transaction when mobileReturnTxHashAsap is true', () => {
      const res = getShouldUpdateApprovalRequest(true, false, false, true);
      expect(res).toBe(false);
    });
    it('returns true for Swap transaction', () => {
      const res = getShouldUpdateApprovalRequest(false, false, true, false);
      expect(res).toBe(true);
    });
    it('returns false for Swap approve transaction', () => {
      const res = getShouldUpdateApprovalRequest(false, false, false, false);
      expect(res).toBe(false);
    });
  });
  describe('getSmartTransactionMetricsProperties', () => {
    let smartTransactionsController: SmartTransactionsController;
    let controllerMessenger: BaseControllerMessenger;

    beforeEach(() => {
      smartTransactionsController = {
        getSmartTransactionByMinedTxHash: jest.fn(),
      } as unknown as SmartTransactionsController;
      controllerMessenger = {
        subscribe: jest.fn(),
      } as unknown as BaseControllerMessenger;
    });

    it('returns empty object if transactionMeta is undefined', async () => {
      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        undefined,
        false,
        controllerMessenger,
      );
      expect(result).toEqual({});
    });

    it('returns metrics if smartTransaction is found by getSmartTransactionByMinedTxHash', async () => {
      const transactionMeta = { hash: '0x123' } as TransactionMeta;
      const smartTransaction = {
        statusMetadata: {
          timedOut: false,
          proxied: true,
        },
      };
      (
        smartTransactionsController.getSmartTransactionByMinedTxHash as jest.Mock
      ).mockReturnValue(smartTransaction);

      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        false,
        controllerMessenger,
      );
      expect(result).toEqual({
        smart_transaction_timed_out: false,
        smart_transaction_proxied: true,
      });
    });

    it('waits for smartTransaction if not found and waitForSmartTransaction is true', async () => {
      const transactionMeta = { hash: '0x123' } as TransactionMeta;
      const smartTransaction = {
        statusMetadata: {
          timedOut: true,
          proxied: false,
        },
      };
      (
        smartTransactionsController.getSmartTransactionByMinedTxHash as jest.Mock
      ).mockReturnValue(undefined);
      (controllerMessenger.subscribe as jest.Mock).mockImplementation(
        (event, callback) => {
          if (
            event ===
            'SmartTransactionsController:smartTransactionConfirmationDone'
          ) {
            setTimeout(() => callback(smartTransaction), 100);
          }
        },
      );

      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        true,
        controllerMessenger,
      );
      expect(result).toEqual({
        smart_transaction_timed_out: true,
        smart_transaction_proxied: false,
      });
    });

    it('returns empty object if smartTransaction is not found and waitForSmartTransaction is false', async () => {
      const transactionMeta = { hash: '0x123' } as TransactionMeta;
      (
        smartTransactionsController.getSmartTransactionByMinedTxHash as jest.Mock
      ).mockReturnValue(undefined);

      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        false,
        controllerMessenger,
      );
      expect(result).toEqual({});
    });

    it('returns empty object if smartTransaction is found but statusMetadata is undefined', async () => {
      const transactionMeta = { hash: '0x123' } as TransactionMeta;
      const smartTransaction = {};
      (
        smartTransactionsController.getSmartTransactionByMinedTxHash as jest.Mock
      ).mockReturnValue(smartTransaction);

      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        false,
        controllerMessenger,
      );
      expect(result).toEqual({});
    });

    it('returns metrics if smartTransaction is found with statusMetadata', async () => {
      const transactionMeta = { hash: '0x123' } as TransactionMeta;
      const smartTransaction = {
        statusMetadata: {
          timedOut: false,
          proxied: true,
        },
      };
      (
        smartTransactionsController.getSmartTransactionByMinedTxHash as jest.Mock
      ).mockReturnValue(smartTransaction);

      const result = await getSmartTransactionMetricsProperties(
        smartTransactionsController,
        transactionMeta,
        false,
        controllerMessenger,
      );
      expect(result).toEqual({
        smart_transaction_timed_out: false,
        smart_transaction_proxied: true,
      });
    });
  });

  describe('getTradeTxTokenFee', () => {
    it('returns the token fee when the full path exists', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [
            {
              tokenFees: ['mockTokenFee'],
            },
          ],
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        approvalTxFees: null,
      } as unknown as GasIncludedQuote;

      const result = getTradeTxTokenFee(mockQuote);
      expect(result).toBe('mockTokenFee');
    });

    it('returns undefined when tradeTxFees is missing', () => {
      const mockQuote = {
        tradeTxFees: null,
        approvalTxFees: null,
      } as GasIncludedQuote;

      const result = getTradeTxTokenFee(mockQuote);
      expect(result).toBeUndefined();
    });
    it('returns undefined when fees array is empty', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [],
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        approvalTxFees: null,
      } as unknown as GasIncludedQuote;

      const result = getTradeTxTokenFee(mockQuote);
      expect(result).toBeUndefined();
    });

    it('returns undefined when tokenFees array is empty', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [
            {
              tokenFees: [],
            },
          ],
        },
      } as unknown as GasIncludedQuote;

      const result = getTradeTxTokenFee(mockQuote);
      expect(result).toBeUndefined();
    });

    it('returns undefined when tokenFees is undefined', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [{}],
        },
      } as unknown as GasIncludedQuote;

      const result = getTradeTxTokenFee(mockQuote);
      expect(result).toBeUndefined();
    });
  });

  describe('getGasIncludedTransactionFees', () => {
    it('returns transaction fees when gas is included and token fee exists', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [
            {
              tokenFees: ['mockTokenFee'],
            },
          ],
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        approvalTxFees: {
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        isGasIncludedTrade: true,
      } as unknown as GasIncludedQuote;

      const result = getGasIncludedTransactionFees(mockQuote);
      expect(result).toEqual({
        approvalTxFees: mockQuote.approvalTxFees,
        tradeTxFees: mockQuote.tradeTxFees,
      });
    });

    it('returns undefined when gas is not included', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [
            {
              tokenFees: ['mockTokenFee'],
            },
          ],
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        approvalTxFees: null,
        isGasIncludedTrade: false,
      } as unknown as GasIncludedQuote;

      const result = getGasIncludedTransactionFees(mockQuote);
      expect(result).toBeUndefined();
    });

    it('returns undefined when token fee does not exist', () => {
      const mockQuote = {
        tradeTxFees: {
          fees: [{}],
          cancelFees: {},
          feeEstimate: '0x0',
          gasLimit: '0x0',
          gasUsed: '0x0',
        },
        approvalTxFees: null,
        isGasIncludedTrade: true,
      } as unknown as GasIncludedQuote;

      const result = getGasIncludedTransactionFees(mockQuote);
      expect(result).toBeUndefined();
    });
  });

  describe('getIsAllowedRpcUrlForSmartTransactions', () => {
    let isProductionMock: jest.SpyInstance;

    beforeEach(() => {
      // Mock isProduction function before each test
      isProductionMock = jest.spyOn(environment, 'isProduction');
    });

    afterEach(() => {
      isProductionMock.mockRestore();
    });

    it('returns true for Infura URLs in production', () => {
      isProductionMock.mockReturnValue(true);
      const result = getIsAllowedRpcUrlForSmartTransactions(
        'https://mainnet.infura.io/v3/abc123',
      );
      expect(result).toBe(true);
    });

    it('returns true for Binance URLs in production', () => {
      isProductionMock.mockReturnValue(true);
      const result = getIsAllowedRpcUrlForSmartTransactions(
        'https://bsc-dataseed.binance.org/',
      );
      expect(result).toBe(true);
    });

    it('returns false for other URLs in production', () => {
      isProductionMock.mockReturnValue(true);
      const result = getIsAllowedRpcUrlForSmartTransactions(
        'https://example.com/rpc',
      );
      expect(result).toBe(false);
    });

    it('returns false for undefined URL in production', () => {
      isProductionMock.mockReturnValue(true);
      const result = getIsAllowedRpcUrlForSmartTransactions(undefined);
      expect(result).toBe(false);
    });

    it('returns true for any URL in non-production environments', () => {
      isProductionMock.mockReturnValue(false);
      const result = getIsAllowedRpcUrlForSmartTransactions(
        'https://example.com/rpc',
      );
      expect(result).toBe(true);
    });

    it('returns true for undefined URL in non-production environments', () => {
      isProductionMock.mockReturnValue(false);
      const result = getIsAllowedRpcUrlForSmartTransactions(undefined);
      expect(result).toBe(true);
    });
  });

  describe('wipeSmartTransactions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call SmartTransactionsController.wipeSmartTransactions with address and ignoreNetwork flag', () => {
      const mockWipeSmartTransactions = Engine.context
        .SmartTransactionsController.wipeSmartTransactions as jest.Mock;
      const testAddress = '0x123456789abcdef123456789abcdef123456789a';

      wipeSmartTransactions(testAddress);

      expect(mockWipeSmartTransactions).toHaveBeenCalledTimes(1);
      expect(mockWipeSmartTransactions).toHaveBeenCalledWith({
        address: testAddress,
        ignoreNetwork: true,
      });
    });
  });
});
