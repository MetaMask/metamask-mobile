import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { Skeleton } from '../../../../../../../component-library/components-temp/Skeleton';
import { useTheme } from '../../../../../../../util/theme';
import QuickBuyBanners from '../QuickBuyBanners';
import QuickBuyConfirmButton from '../QuickBuyConfirmButton';
import { useQuickBuyContext } from '../useQuickBuyContext';
import CollapsibleReveal from './CollapsibleReveal';
import { QuickBuyPercentageSlider } from './QuickBuyPercentageSlider';
import QuickBuyQuickAmounts from './QuickBuyQuickAmounts';
import QuickBuyTokenIcon from './QuickBuyTokenIcon';

/** Fine dotted underline — RN's textDecorationStyle can't control dash size. */
const DOTTED_DASH = 2;
const DOTTED_GAP = 2;

const dottedStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: 1,
    height: 1,
    overflow: 'hidden',
  },
  dash: {
    width: DOTTED_DASH,
    height: 1,
  },
  dashGap: {
    marginRight: DOTTED_GAP,
  },
});

const DottedUnderlineLabel: React.FC<{
  children: string;
}> = ({ children }) => {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const dashCount =
    width > 0
      ? Math.floor((width + DOTTED_GAP) / (DOTTED_DASH + DOTTED_GAP))
      : 0;

  return (
    <View>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        onLayout={(event) => {
          setWidth(event.nativeEvent.layout.width);
        }}
      >
        {children}
      </Text>
      {dashCount > 0 ? (
        <View style={[dottedStyles.row, { width }]}>
          {Array.from({ length: dashCount }, (_, index) => (
            <View
              key={index}
              style={[
                dottedStyles.dash,
                { backgroundColor: colors.text.alternative },
                index === dashCount - 1 ? null : dottedStyles.dashGap,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const QuickBuyActionFooter: React.FC = () => {
  const tw = useTailwind();
  const {
    sliderPercent,
    isSliderDisabled,
    handleSliderChange,
    handleSliderDragEnd,
    confirmButtonState,
    getButtonLabel,
    hasValidAmount,
    isConfirmDisabled,
    handleBuy,
    isHardwareSolanaBlocked,
    tradeMode,
    sourceToken,
    sourceBalanceFiat,
    destBalanceFiat,
    selectedDestStable,
    features,
    setActiveScreen,
    useKeyboard,
    isKeypadOpen,
    totalAmountFiat,
    isTotalLoading,
  } = useQuickBuyContext();

  const pickerToken = tradeMode === 'sell' ? selectedDestStable : sourceToken;
  const pickerBalanceFiat =
    tradeMode === 'sell' ? destBalanceFiat : sourceBalanceFiat;
  // Collapse footer while the keypad expands (same CollapsibleReveal timing) so
  // sheet height lerps closed→open instead of dipping then growing.
  const isFooterExpanded = !(useKeyboard && isKeypadOpen);

  const footerBody = (
    <>
      {features.quickAmountPills ? (
        <Box twClassName="pb-3">
          <QuickBuyQuickAmounts />
        </Box>
      ) : null}

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="pb-3"
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {tradeMode === 'sell'
            ? strings('social_leaderboard.quick_buy.receive')
            : strings('social_leaderboard.quick_buy.pay_with')}
        </Text>

        <TouchableOpacity
          disabled={!features.payWithSheet}
          activeOpacity={0.7}
          accessibilityRole="button"
          testID="quick-buy-pay-with-button"
          onPress={() => setActiveScreen('payWith')}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={3}
          >
            {pickerToken ? (
              <QuickBuyTokenIcon
                token={pickerToken}
                size={AvatarTokenSize.Sm}
                twClassName="h-[20px] w-[20px]"
              />
            ) : null}
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
                {pickerToken
                  ? pickerBalanceFiat
                    ? `${pickerToken.symbol} (${pickerBalanceFiat})`
                    : pickerToken.symbol
                  : '—'}
              </Text>
              {features.payWithSheet ? (
                <Icon
                  name={IconName.ArrowRight}
                  size={IconSize.Sm}
                  color={IconColor.IconDefault}
                />
              ) : null}
            </Box>
          </Box>
        </TouchableOpacity>
      </Box>

      <TouchableOpacity
        onPress={() => setActiveScreen('quoteDetails')}
        activeOpacity={0.7}
        accessibilityRole="button"
        testID="quick-buy-total-row"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="pb-5"
        >
          <DottedUnderlineLabel>
            {strings('social_leaderboard.quick_buy.total')}
          </DottedUnderlineLabel>
          {isTotalLoading ? (
            <Skeleton
              width={56}
              height={16}
              style={tw.style('rounded-md')}
              testID="quick-buy-total-loading"
            />
          ) : (
            <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
              {totalAmountFiat}
            </Text>
          )}
        </Box>
      </TouchableOpacity>

      <QuickBuyConfirmButton
        state={confirmButtonState}
        label={getButtonLabel()}
        hasValidAmount={hasValidAmount}
        isDisabled={isConfirmDisabled}
        onPress={handleBuy}
        tradeMode={tradeMode}
        testID="quick-buy-confirm-button"
      />
    </>
  );

  return (
    <Box twClassName="px-4">
      {/* Slider — control variant only. The keyboard treatment replaces it with
          the numeric keypad rendered below the CTA. */}
      {useKeyboard ? null : (
        <Box twClassName="pt-2 pb-3">
          <QuickBuyPercentageSlider
            value={sliderPercent}
            onValueChange={handleSliderChange}
            disabled={isSliderDisabled}
            onDragEnd={handleSliderDragEnd}
          />
        </Box>
      )}

      <QuickBuyBanners isHardwareSolanaBlocked={isHardwareSolanaBlocked} />

      {useKeyboard ? (
        <CollapsibleReveal
          expanded={isFooterExpanded}
          snapExpandedOnMount
          unmountWhenCollapsed={false}
          testID="quick-buy-footer-reveal"
        >
          {footerBody}
        </CollapsibleReveal>
      ) : (
        footerBody
      )}
    </Box>
  );
};

export default QuickBuyActionFooter;
