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
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
} from '../../../../../reducers/rewards/selectors';
import {
  selectCardGeoLocation,
  selectCardIsLoaded,
} from '../../../../../core/redux/slices/card';
import { selectCardSupportedCountries } from '../../../../../selectors/featureFlagController/card';
import { handleDeeplink } from '../../../../../core/DeeplinkManager';
import musdImage from '../../../../../images/musd-icon-no-background-2x.png';
import cardImage from '../../../../../images/stacked-cards.png';

const styles = StyleSheet.create({
  avatar: { width: 78, height: 78 },
});

interface EarnCardProps {
  image: ImageSourcePropType;
  avatarBgClass: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID: string;
}

const EarnCard: React.FC<EarnCardProps> = ({
  image,
  avatarBgClass,
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
      <Box
        style={[
          tw.style('rounded-lg overflow-hidden', avatarBgClass),
          styles.avatar,
        ]}
      >
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
 * - mUSD calculator card: only shown when geo allows opt-in (not UK)
 * - MetaMask Card card: shown when card geo is loaded and country is supported
 * - While geo is loading: skeletons shown in place of cards; title always visible
 */
const EarnRewardsPreview: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();

  // mUSD geo check
  const optinAllowedForGeo = useSelector(selectOptinAllowedForGeo);
  const isGeoLoading = useSelector(selectOptinAllowedForGeoLoading);
  const showMusdCard = optinAllowedForGeo !== false;

  // Card geo check — isCardGeoLoaded flips true when loadCardholderAccounts settles
  const isCardGeoLoaded = useSelector(selectCardIsLoaded);
  const cardGeoLocation = useSelector(selectCardGeoLocation);
  const cardSupportedCountries = useSelector(
    selectCardSupportedCountries,
  ) as Record<string, boolean>;
  const isCardGeoLoading = !isCardGeoLoaded;
  const showCardCard =
    isCardGeoLoaded && cardSupportedCountries?.[cardGeoLocation] === true;

  const isAnyGeoLoading = isGeoLoading || isCardGeoLoading;

  const handleMusdPress = useCallback(() => {
    navigation.navigate(Routes.MUSD_CALCULATOR_VIEW);
  }, [navigation]);

  const handleCardPress = useCallback(() => {
    handleDeeplink({ uri: 'metamask://card-onboarding' });
  }, []);

  if (!isAnyGeoLoading && !showMusdCard && !showCardCard) {
    return null;
  }

  return (
    <Box
      twClassName="gap-3 p-4"
      testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        {isAnyGeoLoading && (
          <ActivityIndicator size="small" color={colors.primary.default} />
        )}
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.earn_rewards.title')}
        </Text>
      </Box>

      {isAnyGeoLoading ? (
        <>
          <Skeleton style={tw.style('h-28 rounded-xl')} />
          <Skeleton style={tw.style('h-28 rounded-xl')} />
        </>
      ) : (
        <>
          {showMusdCard && (
            <EarnCard
              testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD}
              image={musdImage}
              avatarBgClass="bg-accent04-light"
              title={strings('rewards.earn_rewards.musd_title')}
              subtitle={strings('rewards.earn_rewards.musd_subtitle')}
              onPress={handleMusdPress}
            />
          )}
          {showCardCard && (
            <EarnCard
              testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD}
              image={cardImage}
              avatarBgClass="bg-accent02-light"
              title={strings('rewards.earn_rewards.card_title')}
              subtitle={strings('rewards.earn_rewards.card_subtitle')}
              onPress={handleCardPress}
            />
          )}
        </>
      )}
    </Box>
  );
};

export default EarnRewardsPreview;
