import { useSelector } from 'react-redux';
import { selectIsAccountGroupFunded } from '../../../../selectors/assets/balances';
import { selectIsAssetsLoadingForSelectedAccountGroup } from '../../../../selectors/assets/assets-controller';

/**
 * Whether the selected wallet already holds crypto, and whether that read
 * has finished. `hasCrypto` is false while the first asset load is in
 * flight; callers must check `isLoading` before treating the wallet as empty.
 *
 * @returns Loading flag and the funded-wallet boolean from the account-group
 * balance empty state.
 */
export const useWalletCryptoPresence = (): {
  hasCrypto: boolean;
  isLoading: boolean;
} => {
  const isLoading = useSelector(selectIsAssetsLoadingForSelectedAccountGroup);
  const hasCrypto = useSelector(selectIsAccountGroupFunded);

  return { hasCrypto, isLoading };
};
