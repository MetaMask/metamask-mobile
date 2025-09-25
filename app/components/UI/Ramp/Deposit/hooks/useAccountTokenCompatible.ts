import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';
import { parseCaipChainId } from '@metamask/utils';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';

function useAccountTokenCompatible(
  cryptoCurrency: DepositCryptoCurrency | null,
) {
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const isCompatible = useMemo(() => {
    if (!selectedInternalAccount || !cryptoCurrency) {
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
  }, [cryptoCurrency, selectedInternalAccount]);

  return isCompatible;
}

export default useAccountTokenCompatible;
