import React, { useCallback, useRef, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Engine from '../../../core/Engine';
import QRSigningDetails from './QRSigningDetails';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { RootState } from '../../../reducers';

export const createQRSigningTransactionModalNavDetails =
  createNavigationDetails<QRSigningTransactionModalParams>(
    Routes.QR_SIGNING_TRANSACTION_MODAL,
  );

export interface QRSigningTransactionModalParams {
  onConfirmationComplete: (confirmed: boolean) => void;
  transactionId: string;
  deviceId?: string;
}

const QRSigningTransactionModal = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { colors } = useAppThemeFromContext() || mockTheme;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { ApprovalController } = Engine.context as any;

  const [signingStarted, setSigningStarted] = useState(false);

  const { transactionId, onConfirmationComplete } =
    useParams<QRSigningTransactionModalParams>();

  const pendingScanRequest = useSelector(
    (state: RootState) => state.qrKeyringScanner.pendingScanRequest,
  );
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const dismissModal = useCallback(
    () => sheetRef?.current?.onCloseBottomSheet(),
    [],
  );

  const onRejection = useCallback(() => {
    onConfirmationComplete(false);
    dismissModal();
  }, [onConfirmationComplete, dismissModal]);

  // Start the signing flow when modal mounts
  useEffect(() => {
    if (signingStarted) return;

    const startSigning = async () => {
      setSigningStarted(true);
      try {
        // This triggers the QR keyring which populates pendingScanRequest
        await ApprovalController.accept(transactionId, undefined, {
          waitForResult: true,
        });
        onConfirmationComplete(true);
        dismissModal();
      } catch (error) {
        onConfirmationComplete(false);
        dismissModal();
      }
    };

    startSigning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId, signingStarted]);

  const styles = StyleSheet.create({
    contentWrapper: {
      paddingTop: 24,
      paddingHorizontal: 16,
      paddingBottom: 16,
      height: 600,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 200,
    },
  });

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.contentWrapper}>
        {!pendingScanRequest ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.default} />
          </View>
        ) : (
          <QRSigningDetails
            pendingScanRequest={pendingScanRequest}
            showCancelButton
            tighten
            showHint
            shouldStartAnimated
            successCallback={() => {
              // Signing completion is handled by the useEffect
            }}
            cancelCallback={onRejection}
            failureCallback={onRejection}
            bypassAndroidCameraAccessCheck={false}
            fromAddress={selectedAccount?.address ?? ''}
          />
        )}
      </View>
    </BottomSheet>
  );
};

export default React.memo(QRSigningTransactionModal);
