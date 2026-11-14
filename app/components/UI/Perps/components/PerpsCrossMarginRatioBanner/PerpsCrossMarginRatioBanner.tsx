import React from 'react';
import { BannerAlert } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
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
    description={
      isRatioHidden
        ? strings(`perps.crossMarginRatio.description_hidden_${severity}`)
        : strings('perps.crossMarginRatio.description', { ratio })
    }
    testID={testID}
  />
);

export default PerpsCrossMarginRatioBanner;
