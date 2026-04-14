import BN from 'bnjs4';
import { BoxBackgroundColor } from '@metamask/design-system-react-native';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { TransactionEnvelopeType } from '@metamask/transaction-controller';
import { ToastVariants } from '../../component-library/components/Toast';
import {
  IconColor,
  IconName,
} from '../../component-library/components/Icons/Icon';
import { strings } from '../../../locales/i18n';
import {
  buildTransactionParams,
  getTransactionUpdateErrorToastOptions,
  resolveTransactionUpdateErrorMessage,
} from './transactions';

const ADDRESS_MOCK = '0x1399b0dab86bf1f995BB8aAD9c03D090dA6dFd27';

describe('Confirmation Transactions Utils', () => {
  describe('buildTransactionParams', () => {
    it('checksums from and to address', () => {
      const transactionParams = buildTransactionParams({
        gasDataEIP1559: {},
        gasDataLegacy: {},
        gasEstimateType: GAS_ESTIMATE_TYPES.FEE_MARKET,
        transaction: {
          from: ADDRESS_MOCK.toLowerCase(),
          to: ADDRESS_MOCK.toLowerCase(),
        },
      });

      expect(transactionParams.from).toBe(ADDRESS_MOCK);
      expect(transactionParams.to).toBe(ADDRESS_MOCK);
    });

    it('converts value to hexadecimal string', () => {
      const transactionParams = buildTransactionParams({
        gasDataEIP1559: {},
        gasDataLegacy: {},
        gasEstimateType: GAS_ESTIMATE_TYPES.FEE_MARKET,
        transaction: {
          value: new BN(255),
        },
      });

      expect(transactionParams.value).toBe('0xff');
    });

    it('converts nonce to hexadecimal string', () => {
      const transactionParams = buildTransactionParams({
        gasDataEIP1559: {},
        gasDataLegacy: {},
        gasEstimateType: GAS_ESTIMATE_TYPES.FEE_MARKET,
        transaction: {
          nonce: new BN(255),
        },
      });

      expect(transactionParams.nonce).toBe('0xff');
    });

    it('normalizes gas properties if estimate type is fee market and no envelope type', () => {
      const transactionParams = buildTransactionParams({
        gasDataEIP1559: {
          gasLimitHex: 'AA',
          suggestedMaxFeePerGasHex: 'BB',
          suggestedMaxPriorityFeePerGasHex: 'CC',
          estimatedBaseFeeHex: 'DD',
        },
        gasDataLegacy: {},
        gasEstimateType: GAS_ESTIMATE_TYPES.FEE_MARKET,
        transaction: {
          gas: '0x1',
          gasPrice: '0x2',
          maxFeePerGas: '0x3',
          maxPriorityFeePerGas: '0x4',
          estimatedBaseFee: '0x5',
        },
      });

      expect(transactionParams).toStrictEqual(
        expect.objectContaining({
          gas: '0xAA',
          gasPrice: undefined,
          maxFeePerGas: '0xBB',
          maxPriorityFeePerGas: '0xCC',
          estimatedBaseFee: '0xDD',
        }),
      );
    });

    it('normalizes gas properties if estimate type is fee market and envelope type is legacy', () => {
      const transactionParams = buildTransactionParams({
        gasDataEIP1559: {},
        gasDataLegacy: {
          suggestedGasLimitHex: 'AA',
          suggestedGasPriceHex: 'BB',
        },
        gasEstimateType: GAS_ESTIMATE_TYPES.FEE_MARKET,
        transaction: {
          type: TransactionEnvelopeType.legacy,
          gas: '0x1',
          gasPrice: '0x2',
          maxFeePerGas: '0x3',
          maxPriorityFeePerGas: '0x4',
          estimatedBaseFee: '0x5',
        },
      });

      expect(transactionParams).toStrictEqual(
        expect.objectContaining({
          gas: '0xAA',
          gasPrice: '0xBB',
        }),
      );
    });

    it('normalizes gas properties if estimate type is legacy', () => {
      const transactionParams = buildTransactionParams({
        gasDataEIP1559: {},
        gasDataLegacy: {
          suggestedGasLimitHex: 'AA',
          suggestedGasPriceHex: 'BB',
        },
        gasEstimateType: GAS_ESTIMATE_TYPES.LEGACY,
        transaction: {
          gas: '0x1',
          gasPrice: '0x2',
          maxFeePerGas: '0x3',
          maxPriorityFeePerGas: '0x4',
          estimatedBaseFee: '0x5',
        },
      });

      expect(transactionParams).toStrictEqual(
        expect.objectContaining({
          gas: '0xAA',
          gasPrice: '0xBB',
        }),
      );
    });
  });

  describe('resolveTransactionUpdateErrorMessage', () => {
    it('returns undefined for undefined', () => {
      expect(resolveTransactionUpdateErrorMessage(undefined)).toBeUndefined();
    });

    it('maps nonce too low to friendly message', () => {
      expect(
        resolveTransactionUpdateErrorMessage(new Error('nonce too low')),
      ).toBe(strings('transaction_update_toast.already_confirmed'));
    });

    it('maps nonce too low case-insensitively', () => {
      expect(
        resolveTransactionUpdateErrorMessage(new Error('Nonce Too LOW')),
      ).toBe(strings('transaction_update_toast.already_confirmed'));
    });

    it('returns raw message for other errors', () => {
      expect(
        resolveTransactionUpdateErrorMessage(new Error('insufficient funds')),
      ).toBe('insufficient funds');
    });
  });

  describe('getTransactionUpdateErrorToastOptions', () => {
    it('returns icon toast with title, styling, and description from error', () => {
      expect(getTransactionUpdateErrorToastOptions(new Error('boom'))).toEqual(
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.CircleX,
          iconColor: IconColor.Error,
          backgroundColor: BoxBackgroundColor.Transparent,
          labelOptions: [
            {
              label: strings('transaction_update_toast.title'),
              isBold: true,
            },
          ],
          descriptionOptions: { description: 'boom' },
          hasNoTimeout: false,
        }),
      );
    });

    it('uses friendly description for nonce too low', () => {
      const options = getTransactionUpdateErrorToastOptions(
        new Error('nonce too low'),
      );
      expect(options).toEqual(
        expect.objectContaining({
          descriptionOptions: {
            description: strings('transaction_update_toast.already_confirmed'),
          },
        }),
      );
    });

    it('omits description when no message is available', () => {
      expect(
        getTransactionUpdateErrorToastOptions(undefined).descriptionOptions,
      ).toBeUndefined();
    });
  });
});
