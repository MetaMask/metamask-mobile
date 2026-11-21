import React, { useRef } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';
import { useHomePacks } from '../hooks/useHomePacks';
import { collectiblesRoutes, type BuySheetParams } from '../routeNames';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function BuySheet() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { packCode } =
    useRoute<
      RouteProp<
        Record<typeof collectiblesRoutes.buySheet, BuySheetParams>,
        typeof collectiblesRoutes.buySheet
      >
    >().params;
  const { data: packs } = useHomePacks();
  const pack = packs?.find(({ code }) => code === packCode);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={() => navigation.goBack()}
      testID={collectiblesTestIds.buySheet}
    >
      <BottomSheetHeader
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={{ testID: collectiblesTestIds.buySheetClose }}
      >
        {pack?.name ?? strings('collectibles.title')}
      </BottomSheetHeader>
      <View className="px-4 pb-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('collectibles.buy_sheet.placeholder')}
        </Text>
      </View>
    </BottomSheet>
  );
}
