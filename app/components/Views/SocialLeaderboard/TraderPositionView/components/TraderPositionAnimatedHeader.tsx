import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AnimationDuration } from '@metamask/design-tokens';
import { ButtonIconSize, IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Animated, {
  type SharedValue,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import TraderHeaderIdentity from '../../components/TraderHeaderIdentity';
import type { PerpDirection } from '../../../../UI/SocialFeed/utils/perp';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import ShareButtonSpinner from '../../components/ShareButtonSpinner';
import TraderPositionCompactTokenStats from './TraderPositionCompactTokenStats';
import { useSelector } from 'react-redux';
import ButtonIconGlass from '../../../../../component-library/components-temp/ButtonIconGlass';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

const COMPACT_TITLE_ENTER_OFFSET_PX = 8;
const END_ACCESSORY_SPACER_SIZE = 40;

export interface TraderPositionAnimatedHeaderProps {
  scrollY: SharedValue<number>;
  titleSectionHeight: SharedValue<number>;
  traderName: string;
  traderImageUrl?: string;
  traderAddress?: string;
  traderProfileId?: string;
  symbol: string;
  pricePercentChange: number | undefined;
  activeTimePeriodLabel: string;
  perpDirection?: PerpDirection | null;
  perpLeverage?: number | null;
  onBack: () => void;
  onTraderPress: () => void;
  onShare?: () => void;
  /** Shows a spinner in place of the share button while the link is made. */
  isSharing?: boolean;
}

const styles = StyleSheet.create({
  centerSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    width: '100%',
  },
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endSpacer: {
    height: END_ACCESSORY_SPACER_SIZE,
    width: END_ACCESSORY_SPACER_SIZE,
  },
});

const TraderPositionAnimatedHeader: React.FC<
  TraderPositionAnimatedHeaderProps
> = ({
  scrollY,
  titleSectionHeight,
  traderName,
  traderImageUrl,
  traderAddress,
  traderProfileId,
  symbol,
  pricePercentChange,
  activeTimePeriodLabel,
  perpDirection,
  perpLeverage,
  onBack,
  onTraderPress,
  onShare,
  isSharing = false,
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const compactTokenProgress = useDerivedValue(() => {
    const hasMeasured = titleSectionHeight.value > 0;
    const isTokenSectionHidden =
      hasMeasured && scrollY.value >= titleSectionHeight.value;
    return withTiming(isTokenSectionHidden ? 1 : 0, {
      duration: AnimationDuration.Fast,
    });
  });

  const traderLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - compactTokenProgress.value,
    transform: [
      {
        translateY: compactTokenProgress.value * COMPACT_TITLE_ENTER_OFFSET_PX,
      },
    ],
  }));

  const tokenLayerStyle = useAnimatedStyle(() => ({
    opacity: compactTokenProgress.value,
    transform: [
      {
        translateY:
          (1 - compactTokenProgress.value) * COMPACT_TITLE_ENTER_OFFSET_PX,
      },
    ],
  }));

  const [isTokenHeaderActive, setIsTokenHeaderActive] = useState(false);

  useAnimatedReaction(
    () => compactTokenProgress.value >= 0.5,
    (isActive, previousIsActive) => {
      if (isActive !== previousIsActive) {
        runOnJS(setIsTokenHeaderActive)(isActive);
      }
    },
  );

  return (
    <HeaderStandardGlass
      isGlass={isGlassHeader}
      isFloating={false}
      onBack={onBack}
      backButtonProps={{
        testID: TraderPositionViewSelectorsIDs.BACK_BUTTON,
      }}
      endAccessory={
        onShare && isSharing ? (
          <ShareButtonSpinner
            isCapsule={isGlassHeader}
            testID={TraderPositionViewSelectorsIDs.SHARE_SPINNER}
          />
        ) : onShare ? (
          <ButtonIconGlass
            isCapsule={isGlassHeader}
            iconName={IconName.Share}
            size={ButtonIconSize.Md}
            onPress={onShare}
            accessibilityLabel={strings('social.profile.share_position')}
            testID={TraderPositionViewSelectorsIDs.SHARE_BUTTON}
          />
        ) : (
          <View style={styles.endSpacer} />
        )
      }
      testID={TraderPositionViewSelectorsIDs.HEADER}
      twClassName="bg-default"
    >
      <View style={styles.centerSlot}>
        <Animated.View
          style={[styles.layer, traderLayerStyle]}
          pointerEvents={isTokenHeaderActive ? 'none' : 'auto'}
        >
          <TraderHeaderIdentity
            traderName={traderName}
            traderImageUrl={traderImageUrl}
            traderAddress={traderAddress}
            traderProfileId={traderProfileId}
            variant="nav"
            onPress={onTraderPress}
            testID={TraderPositionViewSelectorsIDs.TRADER_NAME_LINK}
          />
        </Animated.View>
        <Animated.View
          style={[styles.layer, tokenLayerStyle]}
          pointerEvents={isTokenHeaderActive ? 'auto' : 'none'}
        >
          <TraderPositionCompactTokenStats
            symbol={symbol}
            pricePercentChange={pricePercentChange}
            activeTimePeriodLabel={activeTimePeriodLabel}
            perpDirection={perpDirection}
            perpLeverage={perpLeverage}
            traderName={traderName}
            traderImageUrl={traderImageUrl}
            traderAddress={traderAddress}
            traderProfileId={traderProfileId}
            onTraderPress={onTraderPress}
          />
        </Animated.View>
      </View>
    </HeaderStandardGlass>
  );
};

export default TraderPositionAnimatedHeader;
