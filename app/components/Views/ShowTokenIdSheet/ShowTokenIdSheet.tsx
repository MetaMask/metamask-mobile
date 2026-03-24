// Third party dependencies
import React, { useRef } from 'react';

// External dependencies
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text from '../../../component-library/components/Texts/Text/Text';
import { strings } from '../../../../locales/i18n';

// Internal dependencies
import createStyles from './ShowTokenIdSheet.styles';
import { useParams } from '../../../util/navigation/navUtils';
import { ShowTokenIdSheetParams } from './ShowTokenIdSheet.types';
import { View } from 'react-native';

const ShowTokenIdSheet = () => {
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { tokenId } = useParams<ShowTokenIdSheetParams>();

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader style={styles.header}>
        {strings('nft_details.token_id')}
      </BottomSheetHeader>
      <View style={styles.textContent}>
        <Text>{tokenId}</Text>
      </View>
    </BottomSheet>
  );
};

export default ShowTokenIdSheet;
