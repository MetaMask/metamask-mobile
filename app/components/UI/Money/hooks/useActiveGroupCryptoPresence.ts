import { useSelector } from 'react-redux';
import { selectIsAccountGroupFunded } from '../../../../selectors/assets/balances';
import { useAssetsHaveLoaded } from '../../Assets/hooks/useAssetsHaveLoaded';

/**
 * Whether the active account group already holds crypto, and whether that
 * read has finished. `hasCrypto` is false while the asset load is in flight;
 * callers must check `isLoading` before treating the wallet as empty.
 *
 * @returns Loading flag and the funded-wallet boolean from the account-group
 * balance empty state.
 */
export const useActiveGroupCryptoPresence = (): {
  hasCrypto: boolean;
  isLoading: boolean;
} => {
  const assetsHaveLoaded = useAssetsHaveLoaded();
  const hasCrypto = useSelector(selectIsAccountGroupFunded);

  return { hasCrypto, isLoading: !assetsHaveLoaded };
};
