import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
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
  FontWeight,
  SectionHeader,
  Skeleton,
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
// Horizontal padding matches px-4 (16 px per side). CARD_GAP is the space
// between adjacent carousel slides. PEEK_WIDTH is how many pixels of the
// next card show on the right edge as a swipe affordance.
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;
const PEEK_WIDTH = 24;
const MUSD_MONEY_URL = 'metamask://money';

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
  title: ReactNode;
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
        {title}
        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {subtitle}
        </Text>
      </Box>
    </Pressable>
  );
};

type CarouselSlotKey = 'musd-skeleton' | 'musd';

/**
 * EarnRewardsPreview shows the "Earn rewards" section on the dashboard.
 *
 * The only slide is the mUSD calculator. It is shown when geoLocation has
 * settled and is not UK. 'UNKNOWN' is treated as non-UK. It is hidden when
 * the location is still unknown or is 'GB', so UK users do not see a flash.
 * The section stays unmounted until the location is known and is not the UK,
 * so a loading skeleton does not appear and then disappear. If Money is off,
 * or there is no slide to show, the section is not rendered.
 */
const EarnRewardsPreview: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  // mUSD geo check - hide for UK users, require positive geo confirmation to avoid flash
  const geoLocation = useSelector(selectGeolocationLocation);
  const geoStatus = useSelector(selectGeolocationStatus);
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isMusdGeoLoading = geoStatus === 'loading' || geoStatus === 'idle';
  const showMusdCard =
    isMoneyAccountEnabled &&
    geoLocation !== undefined &&
    geoLocation !== UK_COUNTRY_CODE;
  // A skeleton only while we already know the tile will stay. An unknown or UK
  // location must not mount the section and then remove it.
  const showMusdSkeleton =
    isMoneyAccountEnabled &&
    isMusdGeoLoading &&
    geoLocation !== undefined &&
    geoLocation !== UK_COUNTRY_CODE;
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

  // Disable presses only while the user is actively dragging the carousel.
  // We intentionally do NOT include momentum-scroll state here so that taps
  // during deceleration still register and stop the scroll.
  const [isDragging, setIsDragging] = useState(false);
  const handleScrollBeginDrag = useCallback(() => setIsDragging(true), []);
  const handleScrollEndDrag = useCallback(() => setIsDragging(false), []);

  // Build the ordered list of carousel slots, preserving existing visibility logic.
  const items: CarouselSlotKey[] = [];
  if (showMusdSkeleton && !showMusdCard) {
    items.push('musd-skeleton');
  } else if (showMusdCard) {
    items.push('musd');
  }
  const itemCount = items.length;
  // One tile fills the section. Extra tiles keep a gap and a peek of the next one.
  const cardWidth =
    itemCount > 1
      ? screenWidth - HORIZONTAL_PADDING - CARD_GAP - PEEK_WIDTH
      : screenWidth - HORIZONTAL_PADDING * 2;

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
    <Box testID={REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW}>
      <SectionHeader
        title={strings('rewards.earn_rewards.title')}
        startAccessory={
          showMusdSkeleton ? (
            <ActivityIndicator size="small" color={colors.primary.default} />
          ) : undefined
        }
      />
      {/* paddingTop matches CampaignsPreview / BenefitsPreview, where
          sections pair SectionHeader with a pt-3 content box. */}
      <Box paddingTop={3}>
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
                  title={
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
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
                  disabled={isDragging}
                />
              )}
            </View>
          ))}
        </ScrollView>
      </Box>
    </Box>
  );
};

export default EarnRewardsPreview;
