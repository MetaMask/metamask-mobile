import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';

/**
 * Surfaces the security risk the transaction security check found in the quote.
 */
export const BlockaidErrorBanner = () => {
  const { blockaidError } = useBridgeQuoteDataContext();

  if (!blockaidError) {
    return null;
  }

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Danger}
      title={strings('bridge.blockaid_error_title')}
      description={blockaidError}
      testID={SwapsBannersSelectorsIDs.BLOCKAID_ERROR}
    />
  );
};
