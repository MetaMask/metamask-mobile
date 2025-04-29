import { renderFromWei, hexToBN } from '../../../../../../util/number';
import {
  getTicker,
  decodeTransferData,
} from '../../../../../../util/transactions';
import { strings } from '../../../../../../../locales/i18n';
import type BN4 from 'bnjs4';

interface SelectedAsset {
  address: string;
  decimals: string;
  symbol: string;
}

export const generateInsufficientBalanceMessage = (
  weiBalance: BN4,
  transactionValue: BN4,
  ticker: string,
) => {
  const amount = renderFromWei(transactionValue.sub(weiBalance));
  const tokenSymbol = getTicker(ticker);
  return strings('transaction.insufficient_amount', {
    amount,
    tokenSymbol,
  });
};

export const validateBalance = (weiBalance: BN4, transactionValue: BN4) =>
  !weiBalance.gte(transactionValue) || weiBalance.isZero();

export const validateSufficientTokenBalance = (
  transaction: {
    data: string;
  },
  contractBalances: { [key: string]: string },
  selectedAsset: SelectedAsset,
) => {
  const [, , amount] = decodeTransferData('transfer', transaction.data);
  const tokenBalance = hexToBN(contractBalances[selectedAsset.address]);
  const weiInput = hexToBN(amount);

  if (!tokenBalance.gte(weiInput)) {
    return strings('transaction.insufficient_tokens', {
      token: selectedAsset.symbol,
    });
  }

  return undefined;
};

export const validateSufficientBalance = (
  weiBalance: BN4,
  totalTransactionValue: BN4,
  ticker: string,
) => {
  if (validateBalance(weiBalance, totalTransactionValue)) {
    return generateInsufficientBalanceMessage(
      weiBalance,
      totalTransactionValue,
      ticker,
    );
  }
  return undefined;
};
