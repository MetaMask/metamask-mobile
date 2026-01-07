import { useSelector } from 'react-redux';
import { selectIsMusdConversionTokenListItemCtaEnabledFlag } from '../selectors/featureFlags';

// TODO: Add tests.
export const useMusdConversionTokenListItemCtaVisibility = () => {
  const isMusdConversionTokenListItemCtaEnabled = useSelector(
    selectIsMusdConversionTokenListItemCtaEnabledFlag,
  );

  return {
    isMusdConversionTokenListItemCtaEnabled,
  };
};
