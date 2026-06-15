import React, { useState } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet, View } from 'react-native';
import QRSigningDetails from '../QRSigningDetails';
import { useTheme } from '../../../../util/theme';
import { Theme } from '../../../../util/theme/models';
import { getElevatedSurfaceColor } from '../../../../util/theme/themeUtils';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { QrScanRequest } from '@metamask/eth-qr-keyring';

export const QR_SIGNING_MODAL_CONTENT_TEST_ID = 'qr-signing-modal-content';

interface IQRSigningModalProps {
  isVisible: boolean;
  pendingScanRequest: QrScanRequest;
  onSuccess?: () => void;
  onCancel?: () => void;
  onFailure?: (error: string) => void;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    contentWrapper: {
      justifyContent: 'flex-end',
      height: 600,
      backgroundColor: getElevatedSurfaceColor(theme),
      paddingTop: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
  });

const QRSigningModal = ({
  isVisible,
  pendingScanRequest,
  onSuccess,
  onCancel,
  onFailure,
}: IQRSigningModalProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const [isModalCompleteShow, setModalCompleteShow] = useState(false);
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const handleCancel = () => {
    onCancel?.();
  };
  const handleSuccess = () => {
    onSuccess?.();
  };

  const handleFailure = (error: string) => {
    onFailure?.(error);
  };

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
      <View
        style={styles.contentWrapper}
        testID={QR_SIGNING_MODAL_CONTENT_TEST_ID}
      >
        <QRSigningDetails
          pendingScanRequest={pendingScanRequest}
          showCancelButton
          tighten
          showHint
          shouldStartAnimated={isModalCompleteShow}
          successCallback={handleSuccess}
          cancelCallback={handleCancel}
          failureCallback={handleFailure}
          fromAddress={selectedAccount?.address ?? ''}
        />
      </View>
    </Modal>
  );
};

export default QRSigningModal;
