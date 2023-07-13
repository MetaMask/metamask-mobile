import React, { ReactNode, useState } from 'react';
import { Text, View } from 'react-native';
import StyledButton from '../StyledButton';
import ActionModal from '../ActionModal';
import { useTheme } from '../../../util/theme';
import createStyles from './styles';

interface ISettingsButtonSectionProps {
  sectionTitle: string;
  sectionButtonText: string;
  descriptionText: ReactNode;
  needsModal: boolean;
  buttonDisabled?: boolean;
  modalTitleText?: string;
  modalDescriptionText?: string;
  modalConfirmButtonText?: string;
  modalCancelButtonText?: string;
  onPress?: () => void;
  modalOnConfirm?: () => void;
  testID?: string;
}

const SettingsButtonSection = ({
  sectionTitle,
  sectionButtonText,
  descriptionText,
  needsModal,
  buttonDisabled,
  modalTitleText,
  modalDescriptionText,
  modalConfirmButtonText,
  modalCancelButtonText,
  onPress,
  modalOnConfirm,
  testID,
}: ISettingsButtonSectionProps) => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const updateShowModalState = () => setModalVisible(!modalVisible);
  const onButtonPress = () => (onPress ? onPress() : updateShowModalState());
  const onModalConfirmPress = () => {
    modalOnConfirm?.();
    setModalVisible(!modalVisible);
  };

  return (
    <>
      <View style={styles.setting}>
        <Text style={styles.title}>{sectionTitle}</Text>
        <Text style={styles.desc}>{descriptionText}</Text>
        <StyledButton
          type="normal"
          onPress={onButtonPress}
          containerStyle={styles.confirmButton}
          disabled={buttonDisabled}
          testID={testID}
        >
          {sectionButtonText}
        </StyledButton>
      </View>
      {needsModal ? (
        <ActionModal
          modalVisible={modalVisible}
          confirmText={modalConfirmButtonText}
          cancelText={modalCancelButtonText}
          onCancelPress={updateShowModalState}
          onRequestClose={updateShowModalState}
          onConfirmPress={onModalConfirmPress}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{modalTitleText}</Text>
            <Text style={styles.modalText}>{modalDescriptionText}</Text>
          </View>
        </ActionModal>
      ) : null}
    </>
  );
};

export default React.memo(SettingsButtonSection);
