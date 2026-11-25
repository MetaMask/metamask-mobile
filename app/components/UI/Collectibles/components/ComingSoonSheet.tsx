import React, { useRef } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { Text } from '../../primitives/Text';
import { View } from '../../primitives/View';

interface Props {
  title: string;
  onClose: () => void;
}

export function ComingSoonSheet({ title, onClose }: Props) {
  const sheetRef = useRef<BottomSheetRef>(null);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={onClose}
      testID={collectiblesTestIds.packsComingSoonSheet}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        {title}
      </BottomSheetHeader>
      <View className="px-4 pb-6">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('collectibles.packs.coming_soon')}
        </Text>
      </View>
    </BottomSheet>
  );
}
