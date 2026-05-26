import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
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
// Horizontal padding matches px-4 (16 px per side). CARD_GAP is the space
// between adjacent carousel slides. PEEK_WIDTH is how many pixels of the
// next card show on the right edge as a swipe affordance.
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;
const PEEK_WIDTH = 24;

const styles = StyleSheet.create({
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  cardGap: { marginRight: CARD_GAP },
  // Symmetric padding so the first card snaps flush to the left edge (peek on
  // the right) and the last card snaps flush to the right edge (peek on the
  // left). Snap points are defined explicitly via snapToOffsets.
  carouselContent: { paddingHorizontal: HORIZONTAL_PADDING },
});

interface EarnCardProps {
  image: ImageSourcePropType;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID: string;
  /**
   * When true the card cannot be pressed and will not show pressed state.
   * Used to suppress accidental taps while the user is actively dragging
   * the carousel.
   */
  disabled?: boolean;
}

const EarnCard: React.FC<EarnCardProps> = ({
  image,
  title,
  subtitle,
  onPress,
  testID,
  disabled,
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
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

type CarouselSlotKey = 'musd-skeleton' | 'musd' | 'card';

/**
 * EarnRewardsPreview shows the "Earn rewards" section on the dashboard.
 *
 * mUSD calculator card: shown when geoLocation has settled AND is not UK.
 * 'UNKNOWN' is treated as non-UK so mUSD is shown. Hidden only when undefined
 * (loading) or 'GB' to prevent flash for UK users.
 * MetaMask Card card: always shown.
 * While geo is loading (status 'idle' or 'loading'): a skeleton occupies the
 * mUSD slot; the Card slot is always present.
 * Cards are displayed in a horizontal peek carousel that scales to any
 * number of items: every card except the last snaps flush-left with the next
 * card peeking on the right; the last card snaps flush-right with the
 * previous card peeking on the left. No pagination dots. If there are no
 * items at all the entire section is not rendered.
 */
const EarnRewardsPreview: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  // Only the left padding consumes viewport space at scroll position 0.
  // The right side is filled by CARD_GAP + the next card's peek, so only one
  // HORIZONTAL_PADDING is subtracted.
  const cardWidth = screenWidth - HORIZONTAL_PADDING - CARD_GAP - PEEK_WIDTH;

  // mUSD geo check - hide for UK users, require positive geo confirmation to avoid flash
  const geoLocation = useSelector(selectGeolocationLocation);
  const geoStatus = useSelector(selectGeolocationStatus);
  const isMusdGeoLoading = geoStatus === 'loading' || geoStatus === 'idle';
  const showMusdCard =
    geoLocation !== undefined && geoLocation !== UK_COUNTRY_CODE;

  // Card check — subtitle varies by cardholder status; card is always rendered
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

  // Disable presses only while the user is actively dragging the carousel.
  // We intentionally do NOT include momentum-scroll state here so that taps
  // during deceleration still register and stop the scroll.
  const [isDragging, setIsDragging] = useState(false);
  const handleScrollBeginDrag = useCallback(() => setIsDragging(true), []);
  const handleScrollEndDrag = useCallback(() => setIsDragging(false), []);

  // Build the ordered list of carousel slots, preserving existing visibility logic.
  const items: CarouselSlotKey[] = [];
  if (isMusdGeoLoading && !showMusdCard) {
    items.push('musd-skeleton');
  } else if (showMusdCard) {
    items.push('musd');
  }
  items.push('card');
  const itemCount = items.length;

  // Explicit snap offsets give the first card a flush-left snap (peek on right)
  // and the last card a flush-right snap (peek on left). With symmetric
  // padding, the trailing edge is at:
  //   contentWidth = 2 * HORIZONTAL_PADDING
  //                + itemCount * cardWidth
  //                + (itemCount - 1) * CARD_GAP
  // and maxScroll = contentWidth - screenWidth.
  const snapOffsets = useMemo(() => {
    const contentWidth =
      HORIZONTAL_PADDING * 2 +
      itemCount * cardWidth +
      Math.max(0, itemCount - 1) * CARD_GAP;
    const maxScroll = Math.max(0, contentWidth - screenWidth);
    return Array.from({ length: itemCount }, (_, i) =>
      i === itemCount - 1 ? maxScroll : i * (cardWidth + CARD_GAP),
    );
  }, [itemCount, cardWidth, screenWidth]);

  if (itemCount === 0) return null;

  const cardStyle = { width: cardWidth };

  return (
    <Box
      twClassName="gap-3 pb-3"
      testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2 px-4"
      >
        {isMusdGeoLoading && (
          <ActivityIndicator size="small" color={colors.primary.default} />
        )}
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.earn_rewards.title')}
        </Text>
      </Box>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToOffsets={snapOffsets}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        contentContainerStyle={styles.carouselContent}
      >
        {items.map((item, index) => (
          <View
            key={item}
            style={[cardStyle, index < items.length - 1 && styles.cardGap]}
          >
            {item === 'musd-skeleton' && (
              <Skeleton style={tw.style('h-28 rounded-xl')} />
            )}
            {item === 'musd' && (
              <EarnCard
                testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_MUSD_CARD}
                image={musdImage}
                title={strings('rewards.earn_rewards.musd_title')}
                subtitle={strings('rewards.earn_rewards.musd_subtitle')}
                onPress={handleMusdPress}
                disabled={isDragging}
              />
            )}
            {item === 'card' && (
              <EarnCard
                testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_CARD_CARD}
                image={cardImage}
                title={strings('rewards.earn_rewards.card_title')}
                subtitle={cardSubtitle}
                onPress={handleCardPress}
                disabled={isDragging}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </Box>
  );
};

export default EarnRewardsPreview;
