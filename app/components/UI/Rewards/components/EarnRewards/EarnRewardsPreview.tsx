import React, { ReactNode, useCallback } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  FontWeight,
  SectionHeader,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { strings } from '../../../../../../locales/i18n';
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../selectors/geolocationController';
import { handleDeeplink } from '../../../../../core/DeeplinkManager';
import useMoneyVaultApy from '../../../Money/hooks/useMoneyVaultApy';
import { selectMoneyEnableMoneyAccountFlag } from '../../../Money/selectors/featureFlags';
import musdImage from '../../../../../images/rewards/rewards-musd-earn.png';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { MONEY_DISCLAIMER_URL } from '../../../../../constants/urls';

const AVATAR_SIZE = 78;
const UK_COUNTRY_CODE = 'GB';
// Horizontal padding matches px-4 (16 px per side) used by the other Rewards
// sections. The single tile fills the space inside that inset.
const HORIZONTAL_PADDING = 16;
const MUSD_MONEY_URL = 'metamask://money';

const styles = StyleSheet.create({
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  tile: { paddingHorizontal: HORIZONTAL_PADDING },
});

interface EarnCardProps {
  image: ImageSourcePropType;
  title: ReactNode;
  subtitle: string;
  onPress: () => void;
  testID: string;
}

const EarnCard: React.FC<EarnCardProps> = ({
  image,
  title,
  subtitle,
  onPress,
  testID,
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) =>
        tw.style(
          'rounded-xl bg-muted flex-row items-center p-4 gap-4',
          pressed && 'opacity-70',
        )
      }
      onPress={onPress}
    >
      <Box style={[tw.style('rounded-lg overflow-hidden'), styles.avatar]}>
        <Image
          source={image}
          style={tw.style('w-full h-full')}
          resizeMode="cover"
        />
      </Box>
      <Box twClassName="flex-1">
        {title}
        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {subtitle}
        </Text>
      </Box>
    </Pressable>
  );
};

/**
 * EarnRewardsPreview shows the "Earn rewards" section on the dashboard.
 *
 * The only tile is the mUSD calculator. It is shown when the location is
 * known and is not the UK. 'UNKNOWN' is treated as non-UK. The section stays
 * unmounted while the location is unknown or is 'GB', and while Money is off.
 */
const EarnRewardsPreview: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();

  // mUSD geo check - hide for UK users, require positive geo confirmation to avoid flash
  const geoLocation = useSelector(selectGeolocationLocation);
  const geoStatus = useSelector(selectGeolocationStatus);
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isMusdGeoLoading = geoStatus === 'loading' || geoStatus === 'idle';
  const showMusdCard =
    isMoneyAccountEnabled &&
    geoLocation !== undefined &&
    geoLocation !== UK_COUNTRY_CODE;
  // Header spinner only when the tile will stay on screen. An unknown or UK
  // location must not mount the section and then remove it.
  const showHeaderSpinner = showMusdCard && isMusdGeoLoading;
  const { apyPercent } = useMoneyVaultApy();

  const handleMusdPress = useCallback(() => {
    handleDeeplink({ uri: MUSD_MONEY_URL });
  }, []);

  const handleMusdDisclaimerPress = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: MONEY_DISCLAIMER_URL,
          timestamp: Date.now(),
        },
      });
    },
    [navigation],
  );

  if (!showMusdCard) return null;

  return (
    <Box testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW}>
      <SectionHeader
        title={strings('rewards.earn_rewards.title')}
        startAccessory={
          showHeaderSpinner ? (
            <ActivityIndicator size="small" color={colors.primary.default} />
          ) : undefined
        }
      />
      {/* paddingTop matches CampaignsPreview / BenefitsPreview, where
          sections pair SectionHeader with a pt-3 content box. */}
      <Box paddingTop={3}>
        <View
          testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_TILE}
          style={styles.tile}
        >
          <EarnCard
            testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD}
            image={musdImage}
            title={
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('rewards.earn_rewards.musd_money_title', {
                  percentage: apyPercent ?? 3,
                })}
                <Text
                  accessibilityRole="link"
                  accessibilityLabel={strings(
                    'rewards.earn_rewards.musd_disclaimer_accessibility_label',
                  )}
                  testID={
                    REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_DISCLAIMER_LINK
                  }
                  twClassName="text-primary"
                  onPress={handleMusdDisclaimerPress}
                >
                  *
                </Text>
              </Text>
            }
            subtitle={strings('rewards.earn_rewards.musd_subtitle')}
            onPress={handleMusdPress}
          />
        </View>
      </Box>
    </Box>
  );
};

export default EarnRewardsPreview;
