import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
} from '@metamask/design-system-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { dismissBanner } from '../../../../../reducers/banners';
import { selectDismissedBanners } from '../../../../../selectors/banner';
import { selectPredictFeedBannerConfig } from '../../selectors/featureFlags';
import {
  PredictFeedBannerPosition,
  PredictFeedBannerSeverity,
} from '../../constants/feedBanner';
import { PredictFeedBannerSelectorsIDs } from './PredictFeedBanner.testIds';

const DISMISSAL_KEY_PREFIX = 'predict-feed-banner:';

const BANNER_ALERT_SEVERITY = {
  [PredictFeedBannerSeverity.Neutral]: BannerAlertSeverity.Neutral,
  [PredictFeedBannerSeverity.Info]: BannerAlertSeverity.Info,
  [PredictFeedBannerSeverity.Success]: BannerAlertSeverity.Success,
  [PredictFeedBannerSeverity.Warning]: BannerAlertSeverity.Warning,
  [PredictFeedBannerSeverity.Danger]: BannerAlertSeverity.Danger,
};

export const getPredictFeedBannerDismissalKey = (messageId: string) =>
  `${DISMISSAL_KEY_PREFIX}${messageId}`;

interface PredictFeedBannerProps {
  position: PredictFeedBannerPosition;
  containerClassName?: string;
}

const PredictFeedBanner: React.FC<PredictFeedBannerProps> = ({
  position,
  containerClassName,
}) => {
  const dispatch = useDispatch();
  const config = useSelector(selectPredictFeedBannerConfig);
  const dismissedBanners = useSelector(selectDismissedBanners);
  const dismissalKey = getPredictFeedBannerDismissalKey(config.id);

  if (
    !config.enabled ||
    config.position !== position ||
    dismissedBanners.includes(dismissalKey)
  ) {
    return null;
  }

  const handleDismiss = config.dismissible
    ? () => dispatch(dismissBanner(dismissalKey))
    : undefined;

  return (
    <Box twClassName={containerClassName}>
      <BannerAlert
        severity={BANNER_ALERT_SEVERITY[config.severity]}
        title={config.title}
        description={config.description}
        onClose={handleDismiss}
        closeButtonProps={{
          testID: PredictFeedBannerSelectorsIDs.CLOSE_BUTTON,
        }}
        testID={PredictFeedBannerSelectorsIDs.BANNER}
      />
    </Box>
  );
};

export default PredictFeedBanner;
