import { BN } from 'ethereumjs-util';
import { validateTokenTransaction } from './validation';
import { renderFromWei, hexToBN } from '../../../../../util/number';
import {
  getTicker,
  decodeTransferData,
} from '../../../../../util/transactions';
import { strings } from '../../../../../../locales/i18n';

jest.mock('../../../../../util/number', () => ({
  renderFromWei: jest.fn(),
  hexToBN: jest.fn(),
}));

jest.mock('../../../../../util/transactions', () => ({
  getTicker: jest.fn(),
  decodeTransferData: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

describe('validateTokenTransaction', () => {
  it('return an error message if weiBalance is less than totalTransactionValue', () => {
    const transaction = { data: '0x' };
    const weiBalance = new BN('1000');
    const totalTransactionValue = new BN('2000');
    const contractBalances = { '0x123': '1000' };
    const selectedAsset = { address: '0x123', decimals: '18', symbol: 'TOKEN' };
    const ticker = 'TOKEN';

    (renderFromWei as jest.Mock).mockReturnValue('1');
    (getTicker as jest.Mock).mockReturnValue('TOKEN');
    (strings as jest.Mock).mockReturnValue('Insufficient amount');

    const result = validateTokenTransaction(
      transaction,
      weiBalance,
      totalTransactionValue,
      contractBalances,
      selectedAsset,
      ticker,
    );

    expect(result).toBe('Insufficient amount');
    expect(renderFromWei).toHaveBeenCalledWith(
      totalTransactionValue.sub(weiBalance),
    );
    expect(getTicker).toHaveBeenCalledWith(ticker);
    expect(strings).toHaveBeenCalledWith('transaction.insufficient_amount', {
      amount: '1',
      tokenSymbol: 'TOKEN',
    });
  });

  it('return an error message if tokenBalance is less than weiInput', () => {
    const transaction = { data: '0x' };
    const weiBalance = new BN('2000');
    const totalTransactionValue = new BN('1000');
    const contractBalances = { '0x123': '1000' };
    const selectedAsset = { address: '0x123', decimals: '18', symbol: 'TOKEN' };
    const ticker = 'TOKEN';

    (decodeTransferData as jest.Mock).mockReturnValue([null, null, '5000']);
    (hexToBN as jest.Mock).mockImplementation((value) => new BN(value));
    (strings as jest.Mock).mockReturnValue('Insufficient tokens');

    const result = validateTokenTransaction(
      transaction,
      weiBalance,
      totalTransactionValue,
      contractBalances,
      selectedAsset,
      ticker,
    );

    expect(result).toBe('Insufficient tokens');
    expect(decodeTransferData).toHaveBeenCalledWith(
      'transfer',
      transaction.data,
    );
    expect(hexToBN).toHaveBeenCalledWith('5000');
    expect(strings).toHaveBeenCalledWith('transaction.insufficient_tokens', {
      token: 'TOKEN',
    });
  });

  it('return undefined if weiBalance and tokenBalance are sufficient', () => {
    const transaction = { data: '0x' };
    const weiBalance = new BN('2000');
    const totalTransactionValue = new BN('1000');
    const contractBalances = { '0x123': '5000' };
    const selectedAsset = { address: '0x123', decimals: '18', symbol: 'TOKEN' };
    const ticker = 'TOKEN';

    (decodeTransferData as jest.Mock).mockReturnValue([null, null, '1000']);
    (hexToBN as jest.Mock).mockImplementation((value) => new BN(value));

    const result = validateTokenTransaction(
      transaction,
      weiBalance,
      totalTransactionValue,
      contractBalances,
      selectedAsset,
      ticker,
    );

    expect(result).toBeUndefined();
  });
});
