import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './UnsupportedTokenModal.styles';
import { useStyles } from '../../../../hooks/useStyles';

interface UnsupportedTokenModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const UnsupportedTokenModal: React.FC<UnsupportedTokenModalProps> = ({
  isVisible,
  onClose,
}) => {
  const sheetRef = React.useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  React.useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    } else {
      sheetRef.current?.onCloseBottomSheet();
    }
  }, [isVisible]);

  return (
    <BottomSheet ref={sheetRef} onClose={onClose}>
      <View style={styles.content}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('deposit.token_modal.unsupported_token_title')}
        </Text>

        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('deposit.token_modal.unsupported_token_description')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          size={ButtonSize.Lg}
          onPress={onClose}
          label={strings('navigation.ok')}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </BottomSheet>
  );
};

export default UnsupportedTokenModal;
