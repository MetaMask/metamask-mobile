import React, { useState, useMemo } from 'react';
import { View, Modal, TouchableOpacity, FlatList } from 'react-native';
import Text, {
  TextVariant
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName, IconColor } from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { createStyles } from './PerpsTPSLModal.styles';

interface PerpsTPSLModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (takeProfitPrice?: number, stopLossPrice?: number) => void;
  currentPrice: number;
  direction: 'long' | 'short';
  initialTakeProfitPrice?: number;
  initialStopLossPrice?: number;
}

interface PriceLevel {
  price: number;
  isMarkPrice: boolean;
}

// Styles moved to separate file for better organization

// TODO: PERFORMANCE OPTIMIZATION - Consider replacing modal with screen-based navigation
// Modal-based UI can cause performance issues on mobile according to Margelo recommendations.
// Future improvement: Navigate to a dedicated screen instead of using a modal overlay.
// This would provide better UX and performance, especially for complex interactions.

const PerpsTPSLModal: React.FC<PerpsTPSLModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  currentPrice,
  direction,
  initialTakeProfitPrice,
  initialStopLossPrice,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [takeProfitPrice, setTakeProfitPrice] = useState<number | undefined>(initialTakeProfitPrice);
  const [stopLossPrice, setStopLossPrice] = useState<number | undefined>(initialStopLossPrice);

  // Generate price levels around current price
  const priceLevels = useMemo((): PriceLevel[] => {
    const levels: PriceLevel[] = [];
    const step = currentPrice * 0.005; // 0.5% increments
    const range = 10; // Show 10 levels above and below

    for (let i = range; i >= -range; i--) {
      const price = currentPrice + (step * i);
      levels.push({
        price,
        isMarkPrice: i === 0,
      });
    }

    return levels;
  }, [currentPrice]);

  const handleTPToggle = (price: number) => {
    // For long positions, TP should be above current price
    // For short positions, TP should be below current price
    const isValidTP = direction === 'long' ? price > currentPrice : price < currentPrice;

    if (isValidTP) {
      setTakeProfitPrice(takeProfitPrice === price ? undefined : price);
    }
  };

  const handleSLToggle = (price: number) => {
    // For long positions, SL should be below current price
    // For short positions, SL should be above current price
    const isValidSL = direction === 'long' ? price < currentPrice : price > currentPrice;

    if (isValidSL) {
      setStopLossPrice(stopLossPrice === price ? undefined : price);
    }
  };

  const handleConfirm = () => {
    onConfirm(takeProfitPrice, stopLossPrice);
    onClose();
  };

  const renderPriceLevel = ({ item }: { item: PriceLevel }) => {
    const { price, isMarkPrice } = item;
    const canSetTP = direction === 'long' ? price > currentPrice : price < currentPrice;
    const canSetSL = direction === 'long' ? price < currentPrice : price > currentPrice;
    const isTpSelected = takeProfitPrice === price;
    const isSlSelected = stopLossPrice === price;

    return (
      <View style={[styles.priceRow, isMarkPrice && styles.markPriceRow]}>
        <Text
          variant={TextVariant.BodyMD}
          style={[styles.priceText, isMarkPrice && styles.markPriceText]}
        >
          ${price.toLocaleString()}
        </Text>

        {isMarkPrice && (
          <Text variant={TextVariant.BodySM} style={styles.markPriceLabel}>
            {strings('perps.order.tpslModal.markPrice')}
          </Text>
        )}

        {!isMarkPrice && (
          <View style={styles.actionButtons}>
            {canSetTP && (
              <TouchableOpacity
                style={[
                  styles.tpButton,
                  isTpSelected ? styles.selectedButton : styles.unselectedButton
                ]}
                onPress={() => handleTPToggle(price)}
              >
                <Text style={styles.buttonText}>
                  {isTpSelected ? strings('perps.order.tpslModal.removeTP') : strings('perps.order.tpslModal.addTP')}
                </Text>
              </TouchableOpacity>
            )}

            {canSetSL && (
              <TouchableOpacity
                style={[
                  styles.slButton,
                  isSlSelected ? styles.selectedButton : styles.unselectedButton
                ]}
                onPress={() => handleSLToggle(price)}
              >
                <Text style={styles.buttonText}>
                  {isSlSelected ? strings('perps.order.tpslModal.removeSL') : strings('perps.order.tpslModal.addSL')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.closeButton} />
            <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
              {strings('perps.order.tpslModal.title')}
            </Text>
            <ButtonIcon
              iconName={IconName.Close}
              onPress={onClose}
              iconColor={IconColor.Default}
              style={styles.closeButton}
            />
          </View>

          {/* Price List */}
          <FlatList
            data={priceLevels}
            renderItem={renderPriceLevel}
            keyExtractor={(item) => item.price.toString()}
            style={styles.priceList}
            showsVerticalScrollIndicator={false}
          />

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('perps.order.tpslModal.setLimit')}
              onPress={handleConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PerpsTPSLModal;
