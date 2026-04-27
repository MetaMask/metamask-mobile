import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';
import { selectHomepageSectionsV1Enabled } from '../../../selectors/featureFlagController/homepage';

/**
 * Resets full-view token sort config when leaving a full-view screen.
 */
export const useFullViewSortResetEffect = () => {
  const isHomepageSectionsV1Enabled = useSelector(
    selectHomepageSectionsV1Enabled,
  );
  const shouldResetTokenSortConfigRef = useRef(isHomepageSectionsV1Enabled);

  useEffect(() => {
    shouldResetTokenSortConfigRef.current = isHomepageSectionsV1Enabled;
  }, [isHomepageSectionsV1Enabled]);

  useEffect(
    () => () => {
      if (shouldResetTokenSortConfigRef.current) {
        Engine.context.PreferencesController.setTokenSortConfig(
          DEFAULT_TOKEN_SORT_CONFIG,
        );
      }
    },
    [],
  );
};
