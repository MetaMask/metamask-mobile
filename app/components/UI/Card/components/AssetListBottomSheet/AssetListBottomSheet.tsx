import React, { useMemo } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ScrollView } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { allowancePriority, CardTokenAllowance } from '../../types';
import CardAssetItem from '../CardAssetItem';

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
}) => {
  const sortedBalances = useMemo(
    () =>
      [...balances].sort(
        (a, b) =>
          allowancePriority[a.allowanceState] -
          allowancePriority[b.allowanceState],
      ),
    [balances],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={() => {
        setOpenAssetListBottomSheet(false);
      }}
      testID="asset-list-bottom-sheet"
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => setOpenAssetListBottomSheet(false)}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('card.select_asset')}
        </Text>
      </BottomSheetHeader>
      <ScrollView showsVerticalScrollIndicator={false}>
        {sortedBalances.map((item, index) => (
          <CardAssetItem
            key={`${item.address}-${item.chainId}-${index}`}
            assetKey={item}
            privacyMode={privacyMode}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

export default AssetListBottomSheet;
