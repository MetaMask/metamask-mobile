import { renderFromWei, hexToBN } from '../../../../../util/number';
import {
  getTicker,
  decodeTransferData,
} from '../../../../../util/transactions';
import { strings } from '../../../../../../locales/i18n';
import { BN } from 'ethereumjs-util';

interface SelectedAsset {
  address: string;
  decimals: string;
  symbol: string;
}

export const generateInsufficientBalanceMessage = (
  weiBalance: BN,
  transactionValue: BN,
  ticker: string,
) => {
  const amount = renderFromWei(transactionValue.sub(weiBalance));
  const tokenSymbol = getTicker(ticker);
  return strings('transaction.insufficient_amount', {
    amount,
    tokenSymbol,
  });
};

export const validateBalance = (weiBalance: BN, transactionValue: BN) =>
  !weiBalance.gte(transactionValue);

export const validateTokenTransaction = (
  transaction: {
    data: string;
  },
  weiBalance: BN,
  totalTransactionValue: BN,
  contractBalances: { [key: string]: string },
  selectedAsset: SelectedAsset,
  ticker: string,
) => {
  if (validateBalance(weiBalance, totalTransactionValue)) {
    return generateInsufficientBalanceMessage(
      weiBalance,
      totalTransactionValue,
      ticker,
    );
  }

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
