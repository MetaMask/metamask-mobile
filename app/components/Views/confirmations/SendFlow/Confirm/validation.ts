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

export const validateEthOrTokenTransaction = (
  weiBalance: BN,
  totalTransactionValue: BN,
  ticker: string,
) => {
  if (!weiBalance.gte(totalTransactionValue)) {
    const amount = renderFromWei(totalTransactionValue.sub(weiBalance));
    const tokenSymbol = getTicker(ticker);
    return strings('transaction.insufficient_amount', {
      amount,
      tokenSymbol,
    });
  }
  return undefined;
};

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
  if (!weiBalance.gte(totalTransactionValue)) {
    const amount = renderFromWei(totalTransactionValue.sub(weiBalance));
    const tokenSymbol = getTicker(ticker);
    return strings('transaction.insufficient_amount', {
      amount,
      tokenSymbol,
    });
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
