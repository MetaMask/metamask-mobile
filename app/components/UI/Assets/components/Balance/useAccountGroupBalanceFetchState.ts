import { useSelector } from 'react-redux';
import { selectIsAssetsLoadingForSelectedAccountGroup } from '../../../../../selectors/assets/assets-controller';

export function useAccountGroupBalanceFetchState(): boolean {
  const isAssetsLoading = useSelector(
    selectIsAssetsLoadingForSelectedAccountGroup,
  );

  return !isAssetsLoading;
}
