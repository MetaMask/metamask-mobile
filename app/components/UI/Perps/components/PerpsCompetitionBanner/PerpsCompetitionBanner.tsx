import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image, StyleSheet, Pressable, View } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

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
import { perpsCompetitionBannerDismissedKey } from '../../../../../constants/storage';
import { setPendingDeeplink } from '../../../../../reducers/rewards';
import { selectCampaigns } from '../../../../../reducers/rewards/selectors';
import { getLatestActiveOrUpcomingCampaignOfType } from '../../../Rewards/components/Campaigns/CampaignTile.utils';
import { CampaignType } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import type { PerpsCompetitionBannerProps } from './PerpsCompetitionBanner.types';

// Rewards campaigns are only in Redux once the Rewards tab has been opened, so
// the banner can render before the campaign is known. Dismissals in that window
// are keyed separately rather than against a real campaign id, so they can never
// suppress the banner for a later campaign.
const UNRESOLVED_CAMPAIGN_KEY = 'unknown';
const UNRESOLVED_STORAGE_KEY = perpsCompetitionBannerDismissedKey(
  UNRESOLVED_CAMPAIGN_KEY,
);

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
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const { track } = usePerpsEventTracking();
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null);
  // The storage key a dismissal was made against this session, not a bare
  // boolean: a dismissal must not carry across to a different campaign.
  const dismissedKeyRef = useRef<string | null>(null);
  const campaigns = useSelector(selectCampaigns);

  const dismissedStorageKey = useMemo(() => {
    const campaign = getLatestActiveOrUpcomingCampaignOfType(
      campaigns,
      CampaignType.PERPS_TRADING,
    );
    return perpsCompetitionBannerDismissedKey(
      campaign?.id ?? UNRESOLVED_CAMPAIGN_KEY,
    );
  }, [campaigns]);

  useEffect(() => {
    // A dismissal made before the campaign was known was aimed at whatever the
    // banner was advertising, so it carries forward once the id resolves —
    // otherwise the banner would reappear the moment campaigns land. A
    // dismissal made against a real campaign id applies only to that campaign,
    // so a second campaign still gets its own banner.
    const dismissedKey = dismissedKeyRef.current;
    if (
      dismissedKey === dismissedStorageKey ||
      dismissedKey === UNRESOLVED_STORAGE_KEY
    ) {
      return;
    }
    // The key changes under this effect when campaigns land in Redux, leaving
    // two storage reads racing. Storage gives no ordering guarantee, so without
    // this guard a late read under the previous key can overwrite the newer
    // key's result and hide a banner the user never dismissed.
    let cancelled = false;
    const checkDismissed = async () => {
      try {
        const value = await StorageWrapper.getItem(dismissedStorageKey);
        if (cancelled) {
          return;
        }
        setIsDismissed(value === 'true');
      } catch {
        if (cancelled) {
          return;
        }
        setIsDismissed(false);
      }
    };
    checkDismissed();
    return () => {
      cancelled = true;
    };
  }, [dismissedStorageKey]);

  const handleDismiss = useCallback(async () => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: COMPETITION_BANNER_BUTTON.CLOSE,
      [PERPS_EVENT_PROPERTY.LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
    });
    dismissedKeyRef.current = dismissedStorageKey;
    setIsDismissed(true);
    try {
      await StorageWrapper.setItem(dismissedStorageKey, 'true');
    } catch {
      // Dismiss is best-effort; banner stays hidden for this session
    }
  }, [track, dismissedStorageKey]);

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
