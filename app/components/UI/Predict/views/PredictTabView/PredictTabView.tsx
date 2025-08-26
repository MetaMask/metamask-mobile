import React, { useState, useRef, useCallback } from 'react';
import { TouchableOpacity, View, RefreshControl } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PredictTabView.styles';
import Routes from '../../../../../constants/navigation/Routes';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { useNavigation } from '@react-navigation/native';
import PredictPosition from '../../components/PredictPosition';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import type { Position } from '../../types';
import { FlashList, FlashListRef } from '@shopify/flash-list';

interface PredictTabViewProps {}

const PredictTabView: React.FC<PredictTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { positions, isRefreshing, loadPositions } = usePredictPositions({
    loadOnMount: true,
  });
  const listRef = useRef<FlashListRef<Position>>(null);

  const handleCloseBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  const handleCashOut = useCallback(() => {
    // todo: cash out 💸
  }, []);

  return (
    <View style={styles.wrapper}>
      <FlashList
        ref={listRef}
        data={positions}
        renderItem={({ item }) => (
          <TouchableOpacity
            key={item.conditionId}
            style={styles.marketEntry}
            onPress={() => {
              setIsBottomSheetVisible(true);
            }}
          >
            <PredictPosition position={item} />
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.conditionId}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadPositions({ isRefresh: true })}
          />
        }
        removeClippedSubviews
        decelerationRate={0}
      />
      <View style={styles.viewAllMarkets}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={() => navigation.navigate(Routes.PREDICT.MARKET_LIST)}
          label={strings('predict.view_available_markets')}
        />
      </View>

      {isBottomSheetVisible && (
        <BottomSheet ref={bottomSheetRef} onClose={handleCloseBottomSheet}>
          <BottomSheetHeader onClose={handleCloseBottomSheet}>
            <Text variant={TextVariant.HeadingMD}>
              {strings('predict.sell_position')}
            </Text>
          </BottomSheetHeader>
          <View style={styles.bottomSheetContent}>
            <Text
              variant={TextVariant.HeadingMD}
              color={TextColor.Default}
              style={styles.bottomSheetAmount}
            >
              ${positions[0].currentValue}
            </Text>
          </View>
          <View style={styles.bottomSheetContent}>
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('predict.cash_out')}
              onPress={handleCashOut}
              style={styles.actionButton}
            />
          </View>
        </BottomSheet>
      )}
    </View>
  );
};

export default PredictTabView;
