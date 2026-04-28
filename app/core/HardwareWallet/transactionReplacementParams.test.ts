import { getReplacementGasFeeParams } from './transactionReplacementParams';
import { LedgerReplacementTxTypes } from '../../components/UI/LedgerModals/LedgerTransactionModal';

describe('getReplacementGasFeeParams', () => {
  it('returns only gasPrice from legacy replacement params', () => {
    const replacementParams = {
      type: LedgerReplacementTxTypes.SPEED_UP,
      legacyGasFee: {
        gasPrice: '0xabc',
        unexpected: 'ignore-me',
      },
    };

    const result = getReplacementGasFeeParams(replacementParams);

    expect(result).toStrictEqual({
      gasPrice: '0xabc',
    });
  });

  it('returns eip1559 gas values when legacy gas is incomplete', () => {
    const replacementParams = {
      type: LedgerReplacementTxTypes.CANCEL,
      legacyGasFee: {
        unexpected: 'ignore-me',
      },
      eip1559GasFee: {
        maxFeePerGas: '0xdef',
        maxPriorityFeePerGas: '0x123',
        unexpected: 'ignore-me',
      },
    };

    const result = getReplacementGasFeeParams(replacementParams);

    expect(result).toStrictEqual({
      maxFeePerGas: '0xdef',
      maxPriorityFeePerGas: '0x123',
    });
  });

  it('returns undefined when replacement gas fields are incomplete', () => {
    const replacementParams = {
      type: LedgerReplacementTxTypes.CANCEL,
      eip1559GasFee: {
        maxFeePerGas: '0xdef',
      },
    };

    const result = getReplacementGasFeeParams(replacementParams);

    expect(result).toBeUndefined();
  });
});
