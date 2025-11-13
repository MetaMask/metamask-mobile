import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsPositionCardSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { PERPS_CONSTANTS, TP_SL_CONFIG } from '../../constants/perpsConfig';
import type {
  PerpsNavigationParamList,
  Position,
  TPSLTrackingData,
} from '../../controllers/types';
import {
  usePerpsLivePrices,
  usePerpsMarkets,
  usePerpsTPSLUpdate,
} from '../../hooks';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import {
  formatPerpsFiat,
  formatPnl,
  formatPositionSize,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip';
import PerpsTokenLogo from '../PerpsTokenLogo';
import styleSheet from './PerpsPositionCard.styles';

interface PerpsPositionCardProps {
  position: Position;
  expanded?: boolean;
  showIcon?: boolean;
  rightAccessory?: React.ReactNode;
  onPositionUpdate?: () => Promise<void>;
  onTooltipPress?: (contentKey: PerpsTooltipContentKey) => void;
  onTpslCountPress?: (tabId: string) => void;
}

const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  expanded = true, // Default to expanded for backward compatibility
  showIcon = false, // Default to not showing icon
  rightAccessory,
  onPositionUpdate,
  onTooltipPress,
  onTpslCountPress,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);

  const [isTPSLCountWarningVisible, setIsTPSLCountWarningVisible] =
    useState(false);

  const isEligible = useSelector(selectPerpsEligibility);

  const { handleUpdateTPSL } = usePerpsTPSLUpdate({
    onSuccess: () => {
      // Positions update automatically via WebSocket
      // Call parent's position update callback if provided
      if (onPositionUpdate) {
        onPositionUpdate();
      }
    },
  });

  // Determine if position is long or short based on size
  const isLong = parseFloat(position.size) >= 0;
  const direction = isLong ? 'long' : 'short';
  const absoluteSize = Math.abs(parseFloat(position.size));

  const { markets, error, isLoading } = usePerpsMarkets();

  const livePrices = usePerpsLivePrices({ symbols: [position.coin] });

  const marketData = useMemo(
    () => markets.find((market) => market.symbol === position.coin),
    [markets, position.coin],
  );

  const handleCardPress = async () => {
    if (isLoading || error) {
      DevLogger.log(
        'Failed to redirect to market details. Error fetching market data: ',
        error,
      );
      return;
    }

    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: marketData,
        initialTab: 'position',
      },
    });
  };

  const handleClosePress = () => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    DevLogger.log('PerpsPositionCard: Navigating to close position screen');
    navigation.navigate(Routes.PERPS.CLOSE_POSITION, { position });
  };

  const pnlNum = parseFloat(position.unrealizedPnl);

  // ROE is always stored as a decimal (e.g., 0.171 for 17.1%)
  // Convert to percentage for display
  const roeValue = parseFloat(position.returnOnEquity || '0');
  const roe = isNaN(roeValue) ? 0 : roeValue * 100;

  const handleEditTPSL = useCallback(() => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    if (!TP_SL_CONFIG.USE_POSITION_BOUND_TPSL) {
      if (
        (position.takeProfitCount > 0 || position.stopLossCount > 0) &&
        (!position.takeProfitPrice || !position.stopLossPrice)
      ) {
        setIsTPSLCountWarningVisible(true);
        return;
      }
    }

    DevLogger.log('PerpsPositionCard: Editing TPSL', { position });

    navigation.navigate(Routes.PERPS.TPSL, {
      asset: position.coin,
      position,
      initialTakeProfitPrice: position.takeProfitPrice,
      initialStopLossPrice: position.stopLossPrice,
      onConfirm: async (
        takeProfitPrice?: string,
        stopLossPrice?: string,
        trackingData?: TPSLTrackingData,
      ) => {
        await handleUpdateTPSL(
          position,
          takeProfitPrice,
          stopLossPrice,
          trackingData,
        );
      },
    });
  }, [
    isEligible,
    position,
    navigation,
    handleUpdateTPSL,
    setIsEligibilityModalVisible,
    setIsTPSLCountWarningVisible,
  ]);

  const handleSharePress = () => {
    navigation.navigate(Routes.PERPS.PNL_HERO_CARD, {
      position,
      marketPrice: livePrices[position.coin]?.price,
    });
  };

  const handleTpslCountPress = useCallback(async () => {
    if (isLoading || error) {
      DevLogger.log(
        'Failed to redirect to orders tab. Error fetching market data: ',
        error,
      );
      return;
    }

    if (!marketData) {
      DevLogger.log('No market data available for navigation');
      return;
    }

    if (onTpslCountPress) {
      onTpslCountPress('orders');
    }
  }, [isLoading, error, marketData, onTpslCountPress]);

  // Funding cost (cumulative since open) formatting logic
  const fundingSinceOpenRaw = position.cumulativeFunding?.sinceOpen ?? '0';
  const fundingSinceOpen = parseFloat(fundingSinceOpenRaw);
  const isNearZeroFunding = Math.abs(fundingSinceOpen) < 0.005; // Threshold: |value| < $0.005 -> display $0.00

  // Keep original color logic: exact zero = neutral, positive = cost (Error), negative = payment (Success)
  let fundingColorFromValue = TextColor.Default;
  if (fundingSinceOpen > 0) {
    fundingColorFromValue = TextColor.Error;
  } else if (fundingSinceOpen < 0) {
    fundingColorFromValue = TextColor.Success;
  }
  const fundingColor = isNearZeroFunding
    ? TextColor.Default
    : fundingColorFromValue;

  const fundingSignPrefix = fundingSinceOpen >= 0 ? '-' : '+';
  const fundingDisplay = isNearZeroFunding
    ? '$0.00'
    : `${fundingSignPrefix}${formatPerpsFiat(Math.abs(fundingSinceOpen), {
        ranges: PRICE_RANGES_MINIMAL_VIEW,
      })}`;

  const positionTakeProfitCount = position.takeProfitCount || 0;
  const positionStopLossCount = position.stopLossCount || 0;

  // Shared helper function for rendering TP/SL text
  const renderTPSLText = useCallback(
    (
      _type: 'takeProfit' | 'stopLoss',
      count: number,
      price: string | undefined,
    ) => {
      if (TP_SL_CONFIG.USE_POSITION_BOUND_TPSL) {
        // Multiple orders - show count as clickable
        if (count > 1) {
          return (
            <TouchableOpacity onPress={handleTpslCountPress}>
              <Text style={styles.tpslCountPress}>
                {strings('perps.position.card.tpsl_count_multiple', {
                  count,
                })}
              </Text>
            </TouchableOpacity>
          );
        }

        // Single order with price - show price
        if (count === 1 && price) {
          return (
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {formatPerpsFiat(price, {
                ranges: PRICE_RANGES_UNIVERSAL,
              })}
            </Text>
          );
        }

        // Single order without price - show count as clickable
        if (count === 1 && !price) {
          return (
            <TouchableOpacity onPress={handleTpslCountPress}>
              <Text style={styles.tpslCountPress}>
                {strings('perps.position.card.tpsl_count_single', {
                  count,
                })}
              </Text>
            </TouchableOpacity>
          );
        }

        // No orders - show "Not Set"
        return (
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {strings('perps.position.card.not_set')}
          </Text>
        );
      }

      // if position bound TP/SL is disabled
      if (count > 0 && !price) {
        return (
          <TouchableOpacity onPress={handleTpslCountPress}>
            <Text style={styles.tpslCountPress}>
              {count === 1
                ? strings('perps.position.card.tpsl_count_single', {
                    count,
                  })
                : strings('perps.position.card.tpsl_count_multiple', {
                    count,
                  })}
            </Text>
          </TouchableOpacity>
        );
      }

      return (
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {price !== undefined && price !== null
            ? formatPerpsFiat(price, {
                ranges: PRICE_RANGES_UNIVERSAL,
              })
            : strings('perps.position.card.not_set')}
        </Text>
      );
    },
    [handleTpslCountPress, styles.tpslCountPress],
  );

  const renderStopLossText = useMemo(
    () =>
      renderTPSLText('stopLoss', positionStopLossCount, position.stopLossPrice),
    [renderTPSLText, positionStopLossCount, position.stopLossPrice],
  );

  const renderTakeProfitText = useMemo(
    () =>
      renderTPSLText(
        'takeProfit',
        positionTakeProfitCount,
        position.takeProfitPrice,
      ),
    [renderTPSLText, positionTakeProfitCount, position.takeProfitPrice],
  );

  return (
    <>
      <TouchableOpacity
        style={expanded ? styles.expandedContainer : styles.collapsedContainer}
        // There's not functional reason for the card to be clickable when expanded
        onPress={expanded ? undefined : handleCardPress}
        testID="PerpsPositionCard"
        activeOpacity={expanded ? 1 : 0.2}
      >
        {/* Header - Always shown */}
        <View style={[styles.header, expanded && styles.headerExpanded]}>
          {/* Icon Section - Conditionally shown (only in collapsed mode) */}
          {showIcon && !expanded && (
            <View style={styles.perpIcon}>
              <PerpsTokenLogo symbol={position.coin} size={40} />
            </View>
          )}

          <View style={styles.headerLeft}>
            <View style={styles.headerRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {getPerpsDisplaySymbol(position.coin)} {position.leverage.value}
                x{' '}
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {direction === 'long'
                    ? strings('perps.market.long_lowercase')
                    : strings('perps.market.short_lowercase')}
                </Text>
              </Text>
            </View>
            <View style={styles.headerRow}>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {formatPositionSize(absoluteSize.toString())}{' '}
                {getPerpsDisplaySymbol(position.coin)}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.headerRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {formatPerpsFiat(position.positionValue, {
                  ranges: PRICE_RANGES_MINIMAL_VIEW,
                })}
              </Text>
            </View>
            <View style={styles.headerRow}>
              <Text
                variant={TextVariant.BodySM}
                color={pnlNum >= 0 ? TextColor.Success : TextColor.Error}
              >
                {formatPnl(pnlNum)} ({roe >= 0 ? '+' : ''}
                {roe.toFixed(1)}%)
              </Text>
            </View>
          </View>

          {/* Right Accessory - Conditionally shown */}
          {rightAccessory && (
            <View style={styles.rightAccessory}>{rightAccessory}</View>
          )}
        </View>

        {/* Body - Only shown when expanded */}
        {expanded && (
          <View style={styles.body}>
            <View style={styles.bodyRow}>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.entry_price')}
                </Text>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {formatPerpsFiat(position.entryPrice, {
                    ranges: PRICE_RANGES_UNIVERSAL,
                  })}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.liquidation_price')}
                </Text>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {position.liquidationPrice !== undefined &&
                  position.liquidationPrice !== null
                    ? formatPerpsFiat(position.liquidationPrice, {
                        ranges: PRICE_RANGES_UNIVERSAL,
                      })
                    : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
                </Text>
              </View>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.margin')}
                </Text>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {formatPerpsFiat(position.marginUsed, {
                    ranges: PRICE_RANGES_MINIMAL_VIEW,
                  })}
                </Text>
              </View>
            </View>

            <View style={[styles.bodyRow, styles.bodyRowLast]}>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.take_profit')}
                </Text>
                <>{renderTakeProfitText}</>
              </View>
              <View style={styles.bodyItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.position.card.stop_loss')}
                </Text>
                <>{renderStopLossText}</>
              </View>
              <View style={styles.bodyItem}>
                <View style={styles.fundingCostLabelFlex}>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                    style={styles.fundingCostLabelRightMargin}
                  >
                    {strings('perps.position.card.funding_cost')}
                  </Text>
                  {onTooltipPress && (
                    <TouchableOpacity
                      onPress={() => onTooltipPress('funding_payments')}
                    >
                      <Icon
                        name={IconName.Info}
                        size={IconSize.Sm}
                        color={IconColor.Muted}
                        testID={
                          PerpsMarketDetailsViewSelectorsIDs.FUNDING_RATE_INFO_ICON
                        }
                      />
                    </TouchableOpacity>
                  )}
                </View>
                <Text variant={TextVariant.BodyMD} color={fundingColor}>
                  {fundingDisplay}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer - Only shown when expanded */}
        {expanded && (
          <View style={styles.footer}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Auto}
              label={
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {strings('perps.position.card.close_position')}
                </Text>
              }
              onPress={handleClosePress}
              style={styles.footerButton}
              testID={PerpsPositionCardSelectorsIDs.CLOSE_BUTTON}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Auto}
              label={strings('perps.position.card.edit_tpsl')}
              onPress={handleEditTPSL}
              style={styles.footerButton}
              testID={PerpsPositionCardSelectorsIDs.EDIT_BUTTON}
            />
            <ButtonIcon
              size={ButtonIconSizes.Md}
              iconName={IconName.Share}
              iconColor={IconColor.Default}
              onPress={handleSharePress}
              style={styles.shareButton}
              testID={PerpsPositionCardSelectorsIDs.SHARE_BUTTON}
            />
          </View>
        )}
      </TouchableOpacity>
      {isTPSLCountWarningVisible && (
        // Android Compatibility: Wrap the <Modal> in a plain <View> component to prevent rendering issues and freezing.
        <View>
          <Modal visible transparent animationType="fade">
            <PerpsBottomSheetTooltip
              isVisible
              onClose={() => setIsTPSLCountWarningVisible(false)}
              contentKey={'tpsl_count_warning'}
              buttonConfig={[
                {
                  label: strings(
                    'perps.tooltips.tpsl_count_warning.got_it_button',
                  ),
                  onPress: () => setIsTPSLCountWarningVisible(false),
                  variant: ButtonVariants.Secondary,
                  size: ButtonSize.Lg,
                  testID:
                    PerpsPositionCardSelectorsIDs.TPSL_COUNT_WARNING_TOOLTIP_GOT_IT_BUTTON,
                },
                {
                  label: strings(
                    'perps.tooltips.tpsl_count_warning.view_orders_button',
                  ),
                  onPress: () => handleTpslCountPress(),
                  variant: ButtonVariants.Primary,
                  size: ButtonSize.Lg,
                  testID:
                    PerpsPositionCardSelectorsIDs.TPSL_COUNT_WARNING_TOOLTIP_VIEW_ORDERS_BUTTON,
                },
              ]}
            />
          </Modal>
        </View>
      )}
      {isEligibilityModalVisible && (
        // Android Compatibility: Wrap the <Modal> in a plain <View> component to prevent rendering issues and freezing.
        <View>
          <Modal visible transparent animationType="fade">
            <PerpsBottomSheetTooltip
              isVisible
              onClose={() => setIsEligibilityModalVisible(false)}
              contentKey={'geo_block'}
            />
          </Modal>
        </View>
      )}
    </>
  );
};

export default PerpsPositionCard;
