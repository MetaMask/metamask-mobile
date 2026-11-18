import React, { useRef } from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { RootStackParamList } from '../../../../core/NavigationService/types';

type BuySheetRoute = RouteProp<RootStackParamList, 'CollectiblesBuySheet'>;

/** Placeholder buy sheet over Home until GAC-77. */
function CollectiblesBuySheet() {
  const navigation = useNavigation();
  const { packCode } = useRoute<BuySheetRoute>().params;
  const sheetRef = useRef<BottomSheetRef>(null);
  const tw = useTailwind();

  return (
    <BottomSheet ref={sheetRef} goBack={() => navigation.goBack()}>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        {strings('collectibles.placeholder.buy')}
      </BottomSheetHeader>
      <View style={tw.style('p-4')}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {packCode}
        </Text>
      </View>
    </BottomSheet>
  );
}

export default CollectiblesBuySheet;
