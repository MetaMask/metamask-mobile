import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Routes from '../../../../../constants/navigation/Routes';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import type {
  PerpsNavigationParamList,
  Position,
  PriceUpdate,
} from '../../controllers/types';
import {
  formatPercentage,
  formatPnl,
  formatPrice,
  formatPositionSize,
} from '../../utils/formatUtils';
import { calculatePnLPercentageFromUnrealized } from '../../utils/pnlCalculations';
import styleSheet from './PerpsPositionCard.styles';
import { PerpsPositionCardSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import RemoteImage from '../../../../Base/RemoteImage';

interface PerpsPositionCardProps {
  position: Position;
  onClose?: (position: Position) => void;
  onEdit?: (position: Position) => void;
  disabled?: boolean;
  expanded?: boolean;
  showIcon?: boolean;
  rightAccessory?: React.ReactNode;
  isInPerpsNavContext?: boolean; // NEW: Indicates if this is used within the Perps navigation stack
  priceData?: PriceUpdate | null; // Current market price data
}

const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  onClose,
  onEdit,
  disabled = false,
  expanded = true, // Default to expanded for backward compatibility
  showIcon = false, // Default to not showing icon
  rightAccessory,
  isInPerpsNavContext = true, // Default to true since most usage is within Perps stack
  priceData,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { assetUrl } = usePerpsAssetMetadata(position.coin);

  // Determine if position is long or short based on size
  const isLong = parseFloat(position.size) >= 0;
  const direction = isLong ? 'long' : 'short';
  const absoluteSize = Math.abs(parseFloat(position.size));

  const handleCardPress = async () => {
    // await triggerSelectionHaptic();
    if (isInPerpsNavContext) {
      // Direct navigation when already in Perps stack
      navigation.navigate(Routes.PERPS.POSITION_DETAILS, {
        position,
        action: 'view',
      });
    } else {
      // Navigate to nested Perps screen when in main navigation context
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.POSITION_DETAILS,
        params: {
          position,
          action: 'view',
        },
      });
    }
  };

  const handleClosePress = () => {
    // await triggerSelectionHaptic();
    if (onClose) {
      onClose(position);
    } else {
      // Navigate to position details with close action
      if (isInPerpsNavContext) {
        // Direct navigation when already in Perps stack
        navigation.navigate(Routes.PERPS.POSITION_DETAILS, {
          position,
          action: 'close',
        });
      }
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.POSITION_DETAILS,
        params: {
          position,
          action: 'close',
        },
      });
    }
  };

  const handleEditPress = () => {
    DevLogger.log('PerpsPositionCard: handleEditPress called', {
      hasOnEdit: !!onEdit,
      position: position.coin,
      disabled,
    });
    // await triggerSelectionHaptic();
    if (onEdit) {
      DevLogger.log('PerpsPositionCard: calling onEdit callback');
      onEdit(position);
    } else {
      DevLogger.log('PerpsPositionCard: navigating to position details');
      // Navigate to position details with edit action
      if (isInPerpsNavContext) {
        // Direct navigation when already in Perps stack
        navigation.navigate(Routes.PERPS.POSITION_DETAILS, {
          position,
          action: 'edit_tpsl',
        });
      } else {
        // Navigate to nested Perps screen when in main navigation context
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.POSITION_DETAILS,
          params: {
            position,
            action: 'edit_tpsl',
          },
        });
      }
    }
  };

  const pnlNum = parseFloat(position.unrealizedPnl);
  const pnlPercentage = calculatePnLPercentageFromUnrealized({
    unrealizedPnl: pnlNum,
    entryPrice: parseFloat(position.entryPrice),
    size: parseFloat(position.size),
  });
  const isPositive24h =
    position.cumulativeFunding.sinceChange &&
    parseFloat(position.cumulativeFunding.sinceChange) >= 0;

  return (
    <TouchableOpacity
      style={expanded ? styles.expandedContainer : styles.collapsedContainer}
      onPress={handleCardPress}
      testID="PerpsPositionCard"
      disabled={disabled}
    >
      {/* Header - Always shown */}
      <View style={styles.header}>
        {/* Icon Section - Conditionally shown */}
        {showIcon && (
          <View style={styles.perpIcon}>
            {assetUrl ? (
              <RemoteImage
                source={{ uri: assetUrl }}
                style={styles.tokenIcon}
              />
            ) : (
              <Icon name={IconName.Coin} size={IconSize.Md} />
            )}
          </View>
        )}

        <View style={styles.headerLeft}>
          <View style={styles.headerRow}>
            <Text variant={TextVariant.BodySMBold} color={TextColor.Default}>
              {position.leverage.value}x{' '}
              <Text
                variant={TextVariant.BodySMMedium}
                color={isLong ? TextColor.Success : TextColor.Error}
              >
                {direction}
              </Text>
            </Text>
          </View>
          <View style={styles.headerRow}>
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Muted}>
              {formatPositionSize(absoluteSize.toString())} {position.coin}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.headerRow}>
            <Text variant={TextVariant.BodySMBold} color={TextColor.Default}>
              {formatPrice(position.positionValue)}
            </Text>
          </View>
          <View style={styles.headerRow}>
            <Text
              variant={TextVariant.BodySMBold}
              color={isPositive24h ? TextColor.Success : TextColor.Error}
            >
              {formatPnl(pnlNum)} ({formatPercentage(pnlPercentage)})
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
              <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                {strings('perps.position.card.entry_price')}
              </Text>
              <Text
                variant={TextVariant.BodySMMedium}
                color={TextColor.Default}
              >
                {formatPrice(position.entryPrice)}
              </Text>
            </View>
            <View style={styles.bodyItem}>
              <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                {strings('perps.position.card.market_price')}
              </Text>
              <Text
                variant={TextVariant.BodySMMedium}
                color={TextColor.Default}
              >
                {priceData?.price ? formatPrice(priceData.price) : ''}
              </Text>
            </View>
            <View style={styles.bodyItem}>
              <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                {strings('perps.position.card.liquidity_price')}
              </Text>
              <Text
                variant={TextVariant.BodySMMedium}
                color={TextColor.Default}
              >
                {position.liquidationPrice
                  ? formatPrice(position.liquidationPrice)
                  : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.bodyRow}>
            <View style={styles.bodyItem}>
              <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                {strings('perps.position.card.take_profit')}
              </Text>
              <Text
                variant={TextVariant.BodySMMedium}
                color={TextColor.Default}
              >
                {position.takeProfitPrice
                  ? formatPrice(position.takeProfitPrice)
                  : strings('perps.position.card.not_set')}
              </Text>
            </View>
            <View style={styles.bodyItem}>
              <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                {strings('perps.position.card.stop_loss')}
              </Text>
              <Text
                variant={TextVariant.BodySMMedium}
                color={TextColor.Default}
              >
                {position.stopLossPrice
                  ? formatPrice(position.stopLossPrice)
                  : strings('perps.position.card.not_set')}
              </Text>
            </View>
            <View style={styles.bodyItem}>
              <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                {strings('perps.position.card.margin')}
              </Text>
              <Text
                variant={TextVariant.BodySMMedium}
                color={TextColor.Default}
              >
                {formatPrice(position.marginUsed)}
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
            label={strings('perps.position.card.edit_tpsl')}
            onPress={() => handleEditPress()}
            disabled={disabled}
            style={styles.footerButton}
            testID={PerpsPositionCardSelectorsIDs.EDIT_BUTTON}
          />
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Md}
            width={ButtonWidthTypes.Auto}
            label={strings('perps.position.card.close_position')}
            onPress={() => handleClosePress()}
            disabled={disabled}
            style={styles.footerButton}
            testID={PerpsPositionCardSelectorsIDs.CLOSE_BUTTON}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default PerpsPositionCard;
