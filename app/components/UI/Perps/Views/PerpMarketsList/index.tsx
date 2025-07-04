import React, { useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import styleSheet from './PerpsMarketsList.styles';
import { useStyles } from '../../../../hooks/useStyles';

const PerpsMarketsList = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const { styles, theme } = useStyles(styleSheet, {});

  const handleClose = () => bottomSheetRef.current?.onCloseBottomSheet();

  return (
    <BottomSheet ref={bottomSheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>Perpetuals Market</Text>
      </BottomSheetHeader>
      {/* Container */}
      <View style={styles.container}>
        {/* Token / Last price headers */}
        <View style={styles.listHeader}>
          <Text>Token</Text>
          <Text>Last price/Change</Text>
        </View>
      </View>
    </BottomSheet>
  );
};

export default PerpsMarketsList;
