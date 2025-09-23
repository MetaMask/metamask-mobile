import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { isCaipChainId, parseCaipChainId } from '@metamask/utils';
import { useMemo } from 'react';
import { CryptoCurrency } from '@consensys/on-ramp-sdk';
import { toHex } from '@metamask/controller-utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';

function useAccountTokenCompatible(cryptoCurrency: CryptoCurrency | null) {
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const isCompatible = useMemo(() => {
    if (!selectedInternalAccount || !cryptoCurrency) {
      return false;
    }

    const assetCaipChainId = isCaipChainId(cryptoCurrency.network.chainId)
      ? cryptoCurrency.network.chainId
      : toEvmCaipChainId(toHex(cryptoCurrency.network.chainId));

    const cryptoCurrencyChainIdNamespace =
      parseCaipChainId(assetCaipChainId)?.namespace;

    const accountScopesNamespaces = new Set(
      selectedInternalAccount.scopes.map(
        (scope) => parseCaipChainId(scope)?.namespace,
      ),
    );

    return accountScopesNamespaces.has(cryptoCurrencyChainIdNamespace);
  }, [cryptoCurrency, selectedInternalAccount]);

  return isCompatible;
}
export default useAccountTokenCompatible;
