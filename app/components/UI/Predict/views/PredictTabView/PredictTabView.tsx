import React, { useState, useRef, useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
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

interface PredictTabViewProps {}

const PredictTabView: React.FC<PredictTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const handleCloseBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  const positions = [
    {
      id: 1,
      image: 'https://placeholder.com/42',
      title: 'What price will ETH hit in August?',
      position: 21.03,
      price: 20,
      change: 2.3,
      outcome: '$4,2000',
    },
    {
      id: 2,
      image: 'https://placeholder.com/43',
      title: 'Best AI model by the end of August?',
      position: 79.89,
      price: 80,
      change: 8.3,
      outcome: 'OpenAI',
    },
  ];

  const handleCashOut = useCallback(() => {
    // todo: cash out 💸
  }, []);

  return (
    <View style={styles.wrapper}>
      <View style={styles.marketListContainer}>
        {positions.map((position) => (
          <TouchableOpacity
            style={styles.marketEntry}
            onPress={() => {
              setIsBottomSheetVisible(true);
            }}
          >
            <PredictPosition
              key={position.id}
              image={position.image}
              title={position.title}
              position={position.position}
              price={position.price}
              change={position.change}
              outcome={position.outcome}
            />
          </TouchableOpacity>
        ))}
      </View>
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
            {/* note: hardcoded example */}
            <PredictPosition
              image={positions[0].image}
              title={positions[0].title}
              position={positions[0].position}
              price={positions[0].price}
              change={positions[0].change}
              outcome={positions[0].outcome}
            />
          </BottomSheetHeader>
          <View style={styles.bottomSheetContent}>
            <Text
              variant={TextVariant.HeadingMD}
              color={TextColor.Default}
              style={styles.bottomSheetAmount}
            >
              ${positions[0].position}
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
