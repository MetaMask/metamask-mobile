// Third party dependencies
import React, { useRef } from 'react';

// External dependencies
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader/SheetHeader';
import Text from '../../../component-library/components/Texts/Text/Text';
import { strings } from '../../../../locales/i18n';

// Internal dependencies
import createStyles from './ShowTokenIdSheet.styles';
import { View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation';

type ShowTokenIdSheetProps = StackScreenProps<RootParamList, 'ShowTokenId'>;

const ShowTokenIdSheet = ({ route }: ShowTokenIdSheetProps) => {
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { tokenId } = route.params;

  return (
    <BottomSheet ref={sheetRef}>
      <SheetHeader
        style={styles.header}
        title={strings('nft_details.token_id')}
      />
      <View style={styles.textContent}>
        <Text>{tokenId}</Text>
      </View>
    </BottomSheet>
  );
};

export default ShowTokenIdSheet;
