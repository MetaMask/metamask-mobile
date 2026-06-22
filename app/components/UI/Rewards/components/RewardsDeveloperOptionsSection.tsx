import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from '../../../Views/Settings/DeveloperOptions/DeveloperOptions.styles';
import Routes from '../../../../constants/navigation/Routes';
import {
  setCandidateSubscriptionId,
  setDevForceOnboardingPreview,
  setGeoRewardsMetadata,
  setGeoRewardsMetadataError,
} from '../../../../reducers/rewards';
import { selectDevForceOnboardingPreview } from '../../../../reducers/rewards/selectors';

const DEV_GEO_METADATA = {
  geoLocation: 'DEV',
  optinAllowedForGeo: true,
} as const;

export const RewardsDeveloperOptionsSection = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const isPreviewEnabled = useSelector(selectDevForceOnboardingPreview);

  const handleOpenOnboardingPreview = useCallback(() => {
    dispatch(setDevForceOnboardingPreview(true));
    dispatch(setCandidateSubscriptionId(null));
    dispatch(setGeoRewardsMetadata(DEV_GEO_METADATA));
    dispatch(setGeoRewardsMetadataError(false));
    navigation.navigate(Routes.REWARDS_VIEW);
  }, [dispatch, navigation]);

  const handleExitOnboardingPreview = useCallback(() => {
    dispatch(setDevForceOnboardingPreview(false));
    navigation.navigate(Routes.REWARDS_VIEW);
  }, [dispatch, navigation]);

  return (
    <Box twClassName="gap-2">
      <Text variant={TextVariant.HeadingLg} style={styles.heading}>
        {'Rewards UI'}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {`Onboarding preview: ${String(isPreviewEnabled)}`}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        style={styles.accessory}
        size={ButtonSize.Lg}
        onPress={handleOpenOnboardingPreview}
        isFullWidth
      >
        {'Show rewards onboarding on tab'}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        style={styles.accessory}
        size={ButtonSize.Lg}
        onPress={handleExitOnboardingPreview}
        isDisabled={!isPreviewEnabled}
        isFullWidth
      >
        {'Exit onboarding preview'}
      </Button>
    </Box>
  );
};
