import React from 'react';
import { StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';

import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../../component-library/hooks';
import { UnstakeConfirmationViewProps } from '../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import useConfirmationAlerts from '../../hooks/alerts/useConfirmationAlerts';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { AlertsContextProvider } from '../../context/alert-system-context';
import { ConfirmationContextProvider } from '../../context/confirmation-context';
import { LedgerContextProvider } from '../../context/ledger-context';
import { QRHardwareContextProvider } from '../../context/qr-hardware-context';
import { useConfirmActions } from '../../hooks/useConfirmActions';
import { useConfirmationRedesignEnabled } from '../../hooks/useConfirmationRedesignEnabled';
import { useFlatConfirmation } from '../../hooks/ui/useFlatConfirmation';
import { ConfirmationAssetPollingProvider } from '../confirmation-asset-polling-provider/confirmation-asset-polling-provider';
import GeneralAlertBanner from '../general-alert-banner';
import Info from '../info-root';
import Title from '../title';
import { Footer } from '../footer';
import { Splash } from '../splash';
import styleSheet from './confirm-component.styles';

const ConfirmWrapped = ({
  styles,
  route,
}: {
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
  route?: UnstakeConfirmationViewProps['route'];
}) => {
  const alerts = useConfirmationAlerts();

  return (
    <ConfirmationContextProvider>
      <ConfirmationAssetPollingProvider>
        <AlertsContextProvider alerts={alerts}>
          <QRHardwareContextProvider>
            <LedgerContextProvider>
              <Title />
              <ScrollView style={styles.scrollView} nestedScrollEnabled>
                <TouchableWithoutFeedback>
                  <>
                    <GeneralAlertBanner />
                    <Info route={route} />
                  </>
                </TouchableWithoutFeedback>
              </ScrollView>
              <Footer />
              <Splash />
            </LedgerContextProvider>
          </QRHardwareContextProvider>
        </AlertsContextProvider>
      </ConfirmationAssetPollingProvider>
    </ConfirmationContextProvider>
  );
};

interface ConfirmProps {
  route?: UnstakeConfirmationViewProps['route'];
}

export const Confirm = ({ route }: ConfirmProps) => {
  const { approvalRequest } = useApprovalRequest();
  const { isFlatConfirmation } = useFlatConfirmation();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();

  const { styles } = useStyles(styleSheet, {});

  if (!isRedesignedEnabled) {
    navigation.setOptions({
      headerShown: false,
    });
    return null;
  }

  if (isFlatConfirmation) {
    // Keep this navigation option to prevent Android navigation flickering
    navigation.setOptions({
      headerShown: true,
    });
    return (
      <View style={styles.flatContainer} testID="flat-confirmation-container">
        <ConfirmWrapped styles={styles} route={route} />
      </View>
    );
  }

  return (
    <BottomSheet
      onClose={() => onReject()}
      shouldNavigateBack={false}
      style={styles.bottomSheetDialogSheet}
      testID="modal-confirmation-container"
    >
      <View testID={approvalRequest?.type} style={styles.confirmContainer}>
        <ConfirmWrapped styles={styles} route={route} />
      </View>
    </BottomSheet>
  );
};
