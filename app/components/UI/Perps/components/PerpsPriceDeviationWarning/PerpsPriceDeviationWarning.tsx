import React, { memo } from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsPriceDeviationWarningProps } from './PerpsPriceDeviationWarning.types';

/**
 * Component that displays a warning when the perps price has deviated too much from the spot price
 * This prevents users from opening new positions when the price is significantly different from the spot price
 *
 * **Performance:**
 * - Memoized to prevent unnecessary re-renders
 *
 * @example
 * ```tsx
 * <PerpsPriceDeviationWarning />
 * ```
 */
const PerpsPriceDeviationWarning: React.FC<PerpsPriceDeviationWarningProps> =
  memo(({ testID = 'perps-price-deviation-warning' }) => (
    <BannerAlert
      severity={BannerAlertSeverity.Neutral}
      description={strings('perps.price_deviation_warning.message')}
      testID={testID}
    />
  ));

PerpsPriceDeviationWarning.displayName = 'PerpsPriceDeviationWarning';

export default PerpsPriceDeviationWarning;
