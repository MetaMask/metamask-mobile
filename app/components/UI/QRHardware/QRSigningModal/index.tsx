import React, { useState } from 'react';
import Modal from 'react-native-modal';
import { IQRState } from '../types';
import { StyleSheet, View } from 'react-native';
import QRSigningDetails from '../QRSigningDetails';
import { useTheme } from '../../../../util/theme';
import { useSelector } from 'react-redux';
import { getNormalizedTxState } from '../../../../util/transactions';

interface IQRSigningModalProps {
  isVisible: boolean;
  QRState: IQRState;
  onSuccess?: () => void;
  onCancel?: () => void;
  onFailure?: (error: string) => void;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    contentWrapper: {
      justifyContent: 'flex-end',
      height: 600,
      backgroundColor: colors.background.default,
      paddingTop: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
  });

const QRSigningModal = ({
  isVisible,
  QRState,
  onSuccess,
  onCancel,
  onFailure,
}: IQRSigningModalProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [isModalCompleteShow, setModalCompleteShow] = useState(false);
  const { from } = useSelector(getNormalizedTxState);

  return (
    <Modal
      isVisible={isVisible}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.7}
      backdropColor={colors.overlay.default}
      animationInTiming={600}
      animationOutTiming={600}
      hideModalContentWhileAnimating
      onModalShow={() => {
        setModalCompleteShow(true);
      }}
      onModalHide={() => {
        setModalCompleteShow(false);
      }}
      propagateSwipe
    >
      <View style={styles.contentWrapper}>
        <QRSigningDetails
          QRState={QRState}
          showCancelButton
          tighten
          showHint
          shouldStartAnimated={isModalCompleteShow}
          successCallback={onSuccess}
          cancelCallback={onCancel}
          failureCallback={onFailure}
          bypassAndroidCameraAccessCheck={false}
          fromAddress={from}
        />
      </View>
    </Modal>
  );
};

export default QRSigningModal;
