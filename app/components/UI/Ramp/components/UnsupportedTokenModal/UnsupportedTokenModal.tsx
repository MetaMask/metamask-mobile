import React, { useRef } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
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
      <View style={styles.header}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('deposit.token_modal.unsupported_token_title')}
        </Text>
        <View style={styles.closeButton}>
          <ButtonIcon
            size={ButtonIconSize.Lg}
            iconName={IconName.Close}
            onPress={onClose}
            testID="unsupported-token-modal-close-button"
          />
        </View>
      </View>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('deposit.token_modal.unsupported_token_description')}
        </Text>
      </View>
    </BottomSheet>
  );
};

export default UnsupportedTokenModal;
