import React from 'react';
import { BannerAlert } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CROSS_MARGIN_HIDDEN_VALUE } from '../../utils/crossMarginSummary';
import type { PerpsCrossMarginRatioBannerProps } from './PerpsCrossMarginRatioBanner.types';
import { PerpsCrossMarginRatioBannerSelectorsIDs } from './PerpsCrossMarginRatioBanner.testIds';

const PerpsCrossMarginRatioBanner: React.FC<
  PerpsCrossMarginRatioBannerProps
> = ({
  ratio,
  severity,
  isRatioHidden = false,
  testID = PerpsCrossMarginRatioBannerSelectorsIDs.CONTAINER,
}) => (
  <BannerAlert
    severity={severity}
    description={strings('perps.crossMarginRatio.description', {
      ratio: isRatioHidden ? CROSS_MARGIN_HIDDEN_VALUE : ratio,
    })}
    testID={testID}
  />
);

export default PerpsCrossMarginRatioBanner;
