import React, { ReactNode, useState } from 'react';
import { View } from 'react-native';
import ActionModal from '../ActionModal';
import createStyles from './styles';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';

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
        <Text variant={TextVariant.BodyLGMedium}>{sectionTitle}</Text>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.desc}
        >
          {descriptionText}
        </Text>
        <View style={styles.accessory}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={onButtonPress}
            isDisabled={buttonDisabled || modalVisible}
            testID={testID}
            label={sectionButtonText}
          />
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
          childrenContainerStyle={styles.modalChildrenContainer}
        >
          <View style={styles.modalContentWrapper}>
            <HeaderCenter
              title={modalTitleText}
              onClose={updateShowModalState}
            />
            <View style={styles.modalView}>
              <Text style={styles.modalText}>{modalDescriptionText}</Text>
            </View>
          </View>
        </ActionModal>
      ) : null}
    </>
  );
};

export default React.memo(SettingsButtonSection);
