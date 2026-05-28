import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Pressable, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  IconName,
  ButtonIcon,
  ButtonIconSize,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxBackgroundColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectPerpsCompetitionBannerEnabledFlag } from '../../selectors/featureFlags';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { PERPS_COMPETITION_BANNER_DISMISSED } from '../../../../../constants/storage';
import type { PerpsCompetitionBannerProps } from './PerpsCompetitionBanner.types';

// eslint-disable-next-line import-x/no-commonjs, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const competitionImage = require('../../../../../images/perps-competition-banner.png');

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginHorizontal: 16,
    marginBottom: 8,
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
    fontWeight: '500',
  },
});

const PerpsCompetitionBanner: React.FC<PerpsCompetitionBannerProps> = ({
  testID = 'perps-competition-banner',
}) => {
  const isEnabled = useSelector(selectPerpsCompetitionBannerEnabledFlag);
  const navigation = useNavigation();
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
    setIsDismissed(true);
    try {
      await StorageWrapper.setItem(PERPS_COMPETITION_BANNER_DISMISSED, 'true');
    } catch {
      // Dismiss is best-effort; banner stays hidden for this session
    }
  }, []);

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.REWARDS_VIEW);
  }, [navigation]);

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
