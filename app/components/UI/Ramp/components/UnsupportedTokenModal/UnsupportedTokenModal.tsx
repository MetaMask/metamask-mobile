import React, { useRef } from 'react';
import { View } from 'react-native';

import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './UnsupportedTokenModal.styles';
import { useStyles } from '../../../../hooks/useStyles';

interface UnsupportedTokenModalProps {
  onClose: () => void;
}

const UnsupportedTokenModal: React.FC<UnsupportedTokenModalProps> = ({
  onClose,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  return (
    <BottomSheet ref={sheetRef} onClose={onClose} shouldNavigateBack={false}>
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('deposit.token_modal.unsupported_token_title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD}>
          {strings('deposit.token_modal.unsupported_token_description')}
        </Text>
      </View>
    </BottomSheet>
  );
};

export default UnsupportedTokenModal;
