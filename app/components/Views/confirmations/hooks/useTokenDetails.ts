import { useSelector } from 'react-redux';
import { TokenListToken } from '@metamask/assets-controllers';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { selectTokenList } from '../../../../selectors/tokenListController';

export const useTokenDetails = () => {
  const tokenList = useSelector(selectTokenList);
  const transactionMeta = useTransactionMetadataRequest();
  const addressTo = transactionMeta?.txParams?.to;

  if (!addressTo) {
    return {} as TokenListToken;
  }

  return tokenList[addressTo] || {} as TokenListToken;
};
