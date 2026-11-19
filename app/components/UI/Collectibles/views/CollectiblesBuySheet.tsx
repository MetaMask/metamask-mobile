import React, { useRef } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';

type BuySheetRoute = RouteProp<RootStackParamList, 'CollectiblesBuySheet'>;

/** Placeholder buy sheet over Home until GAC-77. */
export function CollectiblesBuySheet() {
  const navigation = useNavigation();
  const { packCode } = useRoute<BuySheetRoute>().params;
  const sheetRef = useRef<BottomSheetRef>(null);

  return (
    <BottomSheet ref={sheetRef} goBack={() => navigation.goBack()}>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        {strings('collectibles.placeholder.buy')}
      </BottomSheetHeader>
      <View className="p-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {packCode}
        </Text>
      </View>
    </BottomSheet>
  );
}
