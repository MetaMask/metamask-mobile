import React, { useEffect } from 'react';
import {
  BackHandler,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';

import { ConfirmationUIType } from '../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
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
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import { ConfirmationAssetPollingProvider } from '../confirmation-asset-polling-provider/confirmation-asset-polling-provider';
import AlertBanner from '../alert-banner';
import Info from '../info-root';
import Title from '../title';
import { Footer } from '../footer';
import { Splash } from '../splash';
import styleSheet from './confirm-component.styles';
import { TransactionType } from '@metamask/transaction-controller';
import { PerpsDepositSkeleton } from '../../external/perps-temp/components/deposit-skeleton';
import { useParams } from '../../../../../util/navigation/navUtils';
import AnimatedSpinner, { SpinnerSize } from '../../../../UI/AnimatedSpinner';

export enum ConfirmationLoader {
  Default = 'default',
  PerpsDeposit = 'perpsDeposit',
}

export interface ConfirmationParams {
  loader?: ConfirmationLoader;
  maxValueMode?: boolean;
}

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
              <ScrollView
                // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
                // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
                style={styles.scrollView}
                // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
                // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
                contentContainerStyle={styles.scrollViewContent}
                nestedScrollEnabled
              >
                <TouchableWithoutFeedback>
                  <>
                    <AlertBanner ignoreTypes={[TransactionType.perpsDeposit]} />
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
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const { styles } = useStyles(styleSheet, { isFullScreenConfirmation });

  useEffect(() => {
    if (approvalRequest) {
      const options = {
        headerShown: false,
        // If there is an approvalRequest, we need to allow the user to swipe to reject the confirmation
        gestureEnabled: true,
      };

      if (isFullScreenConfirmation) {
        // If the confirmation is full screen, we need to show the header
        options.headerShown = true;
      }
      navigation.setOptions(options);
    }
  }, [approvalRequest, isFullScreenConfirmation, navigation]);

  useEffect(() => {
    if (!approvalRequest) {
      const backHandlerSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        // Do nothing if back button is pressed for Android in case of no approvalRequest (loading state)
        () => undefined,
      );

      return () => {
        backHandlerSubscription.remove();
      };
    }
  }, [approvalRequest]);

  // Show spinner if there is no approvalRequest
  if (!approvalRequest) {
    return <Loader />;
  }

  // Show confirmation in a flat container if the confirmation is full screen
  if (isFullScreenConfirmation) {
    return (
      <View style={styles.flatContainer} testID={ConfirmationUIType.FLAT}>
        <ConfirmWrapped styles={styles} route={route} />
      </View>
    );
  }

  return (
    <BottomSheet
      onClose={() => onReject()}
      shouldNavigateBack={false}
      style={styles.bottomSheetDialogSheet}
      testID={ConfirmationUIType.MODAL}
    >
      <View testID={approvalRequest?.type} style={styles.confirmContainer}>
        <ConfirmWrapped styles={styles} route={route} />
      </View>
    </BottomSheet>
  );
};

function Loader() {
  const { styles } = useStyles(styleSheet, { isFullScreenConfirmation: true });
  const params = useParams<ConfirmationParams>();
  const loader = params?.loader ?? ConfirmationLoader.Default;

  if (loader === ConfirmationLoader.PerpsDeposit) {
    return (
      <View style={styles.flatContainer} testID="confirm-loader-perps-deposit">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
        >
          <PerpsDepositSkeleton />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.spinnerContainer} testID="confirm-loader-default">
      <AnimatedSpinner size={SpinnerSize.MD} />
    </View>
  );
}
