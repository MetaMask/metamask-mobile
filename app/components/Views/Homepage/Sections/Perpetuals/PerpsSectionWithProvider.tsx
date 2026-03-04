import React, { forwardRef } from 'react';
import { useSelector } from 'react-redux';
import { PerpsConnectionProvider } from '../../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import PerpsSection from './PerpsSection';
import type { SectionRefreshHandle } from '../../types';

/**
 * Wraps PerpsSection with WebSocket providers.
 * Gates rendering on the perps feature flag to avoid opening
 * connections when the feature is disabled.
 *
 * Keyed on selected account address so that an account switch
 * remounts the entire provider + hook tree, resetting loading
 * state and showing the skeleton while new data streams in.
 */
const PerpsSectionWithProvider = forwardRef<SectionRefreshHandle>((_, ref) => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);

  if (!isPerpsEnabled) {
    return null;
  }

  return (
    <PerpsConnectionProvider key={selectedAddress} suppressErrorView>
      <PerpsStreamProvider>
        <PerpsSection ref={ref} />
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
});

export default PerpsSectionWithProvider;
