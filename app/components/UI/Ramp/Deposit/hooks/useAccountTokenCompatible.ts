import { useSelector } from 'react-redux';
import { DepositCryptoCurrency } from '../constants';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { parseCaipChainId } from '@metamask/utils';
import { useMemo } from 'react';

function useAccountTokenCompatible(cryptoCurrency: DepositCryptoCurrency) {
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const isCompatible = useMemo(() => {
    if (!selectedInternalAccount) {
      return false;
    }
    const cryptoCurrencyChainIdNamespace = parseCaipChainId(
      cryptoCurrency.chainId,
    ).namespace;
    const accountScopesNamespaces = new Set(
      selectedInternalAccount.scopes.map(
        (scope) => parseCaipChainId(scope).namespace,
      ),
    );

    return accountScopesNamespaces.has(cryptoCurrencyChainIdNamespace);
  }, [cryptoCurrency.chainId, selectedInternalAccount]);

  return isCompatible;
}
export default useAccountTokenCompatible;
