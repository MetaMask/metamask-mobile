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
import musdImage from '../../../../../images/rewards/earn-musd.png';
import cardImage from '../../../../../images/rewards/earn-card.png';

const AVATAR_SIZE = 78;
const INNER_CIRCLE_SIZE = 54;

const styles = StyleSheet.create({
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  innerCircleShadow: {
    width: INNER_CIRCLE_SIZE,
    height: INNER_CIRCLE_SIZE,
    borderRadius: INNER_CIRCLE_SIZE / 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 18,
  },
  innerCircleClip: {
    width: INNER_CIRCLE_SIZE,
    height: INNER_CIRCLE_SIZE,
    borderRadius: INNER_CIRCLE_SIZE / 2,
    overflow: 'hidden',
  },
});

interface EarnCardProps {
  image: ImageSourcePropType;
  avatarBgClass: string;
  /** Rotate the image inside the avatar box, e.g. '12deg' */
  imageRotation?: string;
  /** Scale applied to the image, e.g. 0.9 */
  imageScale?: number;
  /** When true, wraps the image in a centred circle instead of filling the box */
  circularInner?: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID: string;
}

const EarnCard: React.FC<EarnCardProps> = ({
  image,
  avatarBgClass,
  imageRotation,
  imageScale = 1,
  circularInner = false,
  title,
  subtitle,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const imageTransform = [
    ...(imageRotation ? [{ rotate: imageRotation }] : []),
    { scale: imageScale },
  ];

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
          tw.style(
            'rounded-lg overflow-hidden items-center justify-center',
            avatarBgClass,
          ),
          styles.avatar,
        ]}
      >
        {circularInner ? (
          <Box
            style={[
              styles.innerCircleShadow,
              { shadowColor: colors.shadow.default },
            ]}
          >
            <Box style={[styles.innerCircleClip, tw.style('bg-default')]}>
              <Image
                source={image}
                style={[
                  tw.style('w-full h-full'),
                  { transform: imageTransform },
                ]}
                resizeMode="contain"
              />
            </Box>
          </Box>
        ) : (
          <Image
            source={image}
            style={[tw.style('w-full h-full'), { transform: imageTransform }]}
            resizeMode="cover"
          />
        )}
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
              circularInner
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
              imageRotation="12deg"
              imageScale={0.75}
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
