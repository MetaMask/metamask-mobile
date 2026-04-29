import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  FontWeight,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import Routes from '../../../../../constants/navigation/Routes';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { strings } from '../../../../../../locales/i18n';
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../selectors/geolocationController';
import {
  selectIsCardAuthenticated,
  selectIsCardholder,
} from '../../../../../selectors/cardController';
import { handleDeeplink } from '../../../../../core/DeeplinkManager';
import musdImage from '../../../../../images/rewards/rewards-musd-earn.png';
import cardImage from '../../../../../images/rewards/rewards-card-earn.png';

const AVATAR_SIZE = 78;
const UK_COUNTRY_CODE = 'GB';

const styles = StyleSheet.create({
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE },
});

interface EarnCardProps {
  image: ImageSourcePropType;
  title: string;
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
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
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
 * - mUSD calculator card: shown when geoLocation has settled AND is not UK.
 * 'UNKNOWN' is treated as non-UK so mUSD is shown. Hidden only when undefined (loading)
 * or 'GB' to prevent flash for UK users.
 * - MetaMask Card card: shown when card geo is loaded (no country restriction).
 * - While geo is loading (status 'idle' or 'loading'): skeletons shown; title always visible
 */
const EarnRewardsPreview: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();

  // mUSD geo check - hide for UK users, require positive geo confirmation to avoid flash
  const geoLocation = useSelector(selectGeolocationLocation);
  const geoStatus = useSelector(selectGeolocationStatus);
  const isMusdGeoLoading = geoStatus === 'loading' || geoStatus === 'idle';
  const showMusdCard =
    geoLocation !== undefined && geoLocation !== UK_COUNTRY_CODE;

  // Card check — isCardGeoLoaded flips true when loadCardholderAccounts settles
  const isCardholder = useSelector(selectIsCardholder);
  const isAuthenticatedCard = useSelector(selectIsCardAuthenticated);
  const cardSubtitle =
    isCardholder || isAuthenticatedCard
      ? strings('rewards.earn_rewards.card_subtitle_cardholder')
      : strings('rewards.earn_rewards.card_subtitle');

  const handleMusdPress = useCallback(() => {
    navigation.navigate(Routes.REWARDS_MUSD_CALCULATOR_VIEW);
  }, [navigation]);

  const handleCardPress = useCallback(() => {
    handleDeeplink({ uri: 'metamask://card-onboarding' });
  }, []);

  return (
    <Box
      twClassName="gap-3 px-4 pb-3"
      testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        {isMusdGeoLoading && (
          <ActivityIndicator size="small" color={colors.primary.default} />
        )}
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.earn_rewards.title')}
        </Text>
      </Box>

      {isMusdGeoLoading && !showMusdCard ? (
        <Skeleton style={tw.style('h-28 rounded-xl')} />
      ) : (
        showMusdCard && (
          <EarnCard
            testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD}
            image={musdImage}
            title={strings('rewards.earn_rewards.musd_title')}
            subtitle={strings('rewards.earn_rewards.musd_subtitle')}
            onPress={handleMusdPress}
          />
        )
      )}
      <EarnCard
        testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD}
        image={cardImage}
        title={strings('rewards.earn_rewards.card_title')}
        subtitle={cardSubtitle}
        onPress={handleCardPress}
      />
    </Box>
  );
};

export default EarnRewardsPreview;
