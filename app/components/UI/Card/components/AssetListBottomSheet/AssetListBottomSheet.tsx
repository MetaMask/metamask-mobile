import React from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ScrollView } from 'react-native';
import CardAssetItem from '../CardAssetItem/CardAssetItem';
import { strings } from '../../../../../../locales/i18n';
import { CardTokenAllowance } from '../../types';

export interface AssetListBottomSheetProps {
  setOpenAssetListBottomSheet: (open: boolean) => void;
  sheetRef: React.RefObject<BottomSheetRef>;
  balances: CardTokenAllowance[];
  privacyMode: boolean;
}

const AssetListBottomSheet: React.FC<AssetListBottomSheetProps> = ({
  setOpenAssetListBottomSheet,
  sheetRef,
  balances,
  privacyMode,
}) => (
  <BottomSheet
    ref={sheetRef}
    shouldNavigateBack={false}
    onClose={() => {
      setOpenAssetListBottomSheet(false);
    }}
  >
    <BottomSheetHeader onClose={() => setOpenAssetListBottomSheet(false)}>
      <Text variant={TextVariant.HeadingMD}>
        {strings('card.select_asset')}
      </Text>
    </BottomSheetHeader>
    <ScrollView>
      {balances.map((item, index) => (
        <CardAssetItem
          key={`${item.address}-${item.chainId}-${index}`}
          assetKey={item}
          privacyMode={privacyMode}
        />
      ))}
    </ScrollView>
  </BottomSheet>
);

export default AssetListBottomSheet;
