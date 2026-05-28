import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  Icon,
  IconName,
  IconSize,
  IconColor,
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

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  banner: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 5000,
    alignItems: 'center',
    justifyContent: 'center',
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
      const value = await StorageWrapper.getItem(
        PERPS_COMPETITION_BANNER_DISMISSED,
      );
      setIsDismissed(value === 'true');
    };
    checkDismissed();
  }, []);

  const handleDismiss = useCallback(async () => {
    await StorageWrapper.setItem(PERPS_COMPETITION_BANNER_DISMISSED, 'true');
    setIsDismissed(true);
  }, []);

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.REWARDS_VIEW);
  }, [navigation]);

  if (!isEnabled || isDismissed !== false) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={testID}
    >
      <Box
        style={styles.banner}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <Box
          style={styles.iconContainer}
          backgroundColor={BoxBackgroundColor.BackgroundMuted}
        >
          <Icon
            name={IconName.Star}
            size={IconSize.Xl}
            color={IconColor.WarningDefault}
          />
        </Box>

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
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSize.Sm}
              onPress={handleDismiss}
              testID={`${testID}-close`}
            />
          </Box>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('perps.competition_banner.description')}
          </Text>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default PerpsCompetitionBanner;
