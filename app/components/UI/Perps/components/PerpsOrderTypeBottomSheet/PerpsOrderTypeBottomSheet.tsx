import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { Theme } from '../../../../../util/theme/models';
import Routes from '../../../../../constants/navigation/Routes';

interface OrderTypeRouteParams {
  orderType: 'market' | 'limit';
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    contentWrapper: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      paddingBottom: 40,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 20,
      paddingHorizontal: 16,
      marginBottom: 16,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
    },
    selectedOption: {
      backgroundColor: colors.primary.muted,
    },
    optionContent: {
      flex: 1,
      marginRight: 16,
    },
    description: {
      marginTop: 4,
      lineHeight: 20,
    },
  });

const PerpsOrderTypeBottomSheet: React.FC = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: OrderTypeRouteParams }, 'params'>>();
  const { orderType: selectedType } = route.params || { orderType: 'market' };
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet();
  }, []);

  const orderTypes = [
    {
      type: 'market' as const,
      title: 'Market order',
      description: 'Executes immediately at the best available price',
    },
    {
      type: 'limit' as const,
      title: 'Limit order',
      description:
        'Places an order at your specified price — executes only if matched',
    },
  ];

  const handleSelect = (type: 'market' | 'limit') => {
    // Navigate directly to order screen
    navigation.navigate(Routes.PERPS.ORDER, {
      orderTypeUpdate: type,
    });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>Select order type</Text>
      </BottomSheetHeader>

      <View style={styles.contentWrapper}>
        {orderTypes.map(({ type, title, description }) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.option,
              selectedType === type && styles.selectedOption,
            ]}
            onPress={() => handleSelect(type)}
          >
            <View style={styles.optionContent}>
              <Text
                variant={TextVariant.BodyLGMedium}
                color={TextColor.Default}
              >
                {title}
              </Text>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.description}
              >
                {description}
              </Text>
            </View>
            {selectedType === type && (
              <Icon
                name={IconName.Check}
                size={IconSize.Lg}
                color={IconColor.Success}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
};

PerpsOrderTypeBottomSheet.displayName = 'PerpsOrderTypeBottomSheet';

export default PerpsOrderTypeBottomSheet;
