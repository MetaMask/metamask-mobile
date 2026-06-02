import React, { ReactNode, useState } from 'react';
import { View } from 'react-native';
import ActionModal from '../ActionModal';
import createStyles from './styles';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

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
  const styles = createStyles();

  const updateShowModalState = () => setModalVisible(!modalVisible);
  const onButtonPress = () => (onPress ? onPress() : updateShowModalState());
  const onModalConfirmPress = () => {
    modalOnConfirm?.();
    setModalVisible(!modalVisible);
  };

  return (
    <>
      <View style={styles.setting}>
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {sectionTitle}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          style={styles.desc}
        >
          {descriptionText}
        </Text>
        <View style={styles.accessory}>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onButtonPress}
            isDisabled={buttonDisabled || modalVisible}
            testID={testID}
          >
            {sectionButtonText}
          </Button>
        </View>
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
            <Text variant={TextVariant.HeadingMd} style={styles.modalTitle}>
              {modalTitleText}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              style={styles.modalText}
            >
              {modalDescriptionText}
            </Text>
          </View>
        </ActionModal>
      ) : null}
    </>
  );
};

export default React.memo(SettingsButtonSection);
