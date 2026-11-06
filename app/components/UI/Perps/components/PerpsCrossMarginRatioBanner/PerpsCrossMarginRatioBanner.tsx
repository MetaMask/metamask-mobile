import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsCrossMarginRatioBannerProps } from './PerpsCrossMarginRatioBanner.types';
import { PerpsCrossMarginRatioBannerSelectorsIDs } from './PerpsCrossMarginRatioBanner.testIds';

const PerpsCrossMarginRatioBanner: React.FC<
  PerpsCrossMarginRatioBannerProps
> = ({ ratio, testID = PerpsCrossMarginRatioBannerSelectorsIDs.CONTAINER }) => (
  <BannerAlert
    severity={BannerAlertSeverity.Danger}
    description={strings('perps.crossMarginRatio.description', { ratio })}
    testID={testID}
  />
);

export default PerpsCrossMarginRatioBanner;
