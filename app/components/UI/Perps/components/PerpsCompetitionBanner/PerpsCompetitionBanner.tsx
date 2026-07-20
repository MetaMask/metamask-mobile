import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Pressable, View } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  IconName,
  ButtonIcon,
  ButtonIconSize,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxBackgroundColor,
} from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectPerpsCompetitionBannerEnabledFlag } from '../../selectors/featureFlags';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { PERPS_COMPETITION_BANNER_DISMISSED } from '../../../../../constants/storage';
import { setPendingDeeplink } from '../../../../../reducers/rewards';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import type { PerpsCompetitionBannerProps } from './PerpsCompetitionBanner.types';

// Pending addition to PERPS_EVENT_VALUE.BUTTON_CLICKED in @metamask/perps-controller
const COMPETITION_BANNER_BUTTON = {
  ENGAGE: 'competition_banner_engage',
  CLOSE: 'competition_banner_close',
} as const;

// eslint-disable-next-line import-x/no-commonjs, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const competitionImage = require('../../../../../images/perps-competition-banner.png');

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 0,
  },
  banner: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  bannerImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    gap: 8,
  },
  titleText: {
    flex: 1,
  },
});

const PerpsCompetitionBanner: React.FC<PerpsCompetitionBannerProps> = ({
  testID = 'perps-competition-banner',
}) => {
  const isEnabled = useSelector(selectPerpsCompetitionBannerEnabledFlag);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { track } = usePerpsEventTracking();
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    const checkDismissed = async () => {
      try {
        const value = await StorageWrapper.getItem(
          PERPS_COMPETITION_BANNER_DISMISSED,
        );
        setIsDismissed(value === 'true');
      } catch {
        setIsDismissed(false);
      }
    };
    checkDismissed();
  }, []);

  const handleDismiss = useCallback(async () => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: COMPETITION_BANNER_BUTTON.CLOSE,
      [PERPS_EVENT_PROPERTY.LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
    });
    setIsDismissed(true);
    try {
      await StorageWrapper.setItem(PERPS_COMPETITION_BANNER_DISMISSED, 'true');
    } catch {
      // Dismiss is best-effort; banner stays hidden for this session
    }
  }, [track]);

  const handlePress = useCallback(() => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
      [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.BANNER,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: COMPETITION_BANNER_BUTTON.ENGAGE,
      [PERPS_EVENT_PROPERTY.LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
    });
    dispatch(setPendingDeeplink({ campaign: 'perps-comp' }));
    navigation.navigate(Routes.REWARDS_VIEW);
  }, [navigation, dispatch, track]);

  if (!isEnabled || isDismissed !== false) {
    return null;
  }

  return (
    <Pressable style={styles.container} onPress={handlePress} testID={testID}>
      <Box
        style={styles.banner}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <Image
          source={competitionImage}
          style={styles.bannerImage}
          testID={`${testID}-image`}
        />

        <Box style={styles.textContainer}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            style={styles.titleRow}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
              style={styles.titleText}
            >
              {strings('perps.competition_banner.title')}
            </Text>
            <View onStartShouldSetResponder={() => true}>
              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Sm}
                onPress={handleDismiss}
                testID={`${testID}-close`}
              />
            </View>
          </Box>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('perps.competition_banner.description')}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

export default PerpsCompetitionBanner;
