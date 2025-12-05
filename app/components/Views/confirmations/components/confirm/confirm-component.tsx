import React, { ReactNode, useEffect } from 'react';
import { BackHandler, TouchableWithoutFeedback, View } from 'react-native';
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
import { Footer, FooterSkeleton } from '../footer';
import { Splash } from '../splash';
import styleSheet from './confirm-component.styles';
import { TransactionType } from '@metamask/transaction-controller';
import { useParams } from '../../../../../util/navigation/navUtils';
import AnimatedSpinner, { SpinnerSize } from '../../../../UI/AnimatedSpinner';
import { CustomAmountInfoSkeleton } from '../info/custom-amount-info';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import { PredictClaimInfoSkeleton } from '../info/predict-claim-info';
import { TransferInfoSkeleton } from '../info/transfer/transfer';

const TRANSACTION_TYPES_DISABLE_SCROLL = [TransactionType.predictClaim];

const TRANSACTION_TYPES_DISABLE_ALERT_BANNER = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

export enum ConfirmationLoader {
  Default = 'default',
  CustomAmount = 'customAmount',
  PredictClaim = 'predictClaim',
  Transfer = 'transfer',
}

export interface ConfirmationParams {
  loader?: ConfirmationLoader;
  maxValueMode?: boolean;
}

const ConfirmWrapped = ({
  styles,
  route,
}: {
  styles: ReturnType<typeof styleSheet>;
  route?: UnstakeConfirmationViewProps['route'];
}) => {
  const isScrollDisabled = useDisableScroll();

  return (
    <ConfirmationContextProvider>
      <ConfirmationAssetPollingProvider>
        <ConfirmationAlerts>
          <QRHardwareContextProvider>
            <LedgerContextProvider>
              <Title />
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                nestedScrollEnabled
                scrollEnabled={!isScrollDisabled}
              >
                <TouchableWithoutFeedback>
                  <>
                    <AlertBanner
                      ignoreTypes={TRANSACTION_TYPES_DISABLE_ALERT_BANNER}
                    />
                    <Info route={route} />
                  </>
                </TouchableWithoutFeedback>
              </ScrollView>
              <Footer />
              <Splash />
            </LedgerContextProvider>
          </QRHardwareContextProvider>
        </ConfirmationAlerts>
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
      <SafeAreaView
        edges={['right', 'bottom', 'left']}
        style={styles.flatContainer}
        testID={ConfirmationUIType.FLAT}
      >
        <ConfirmWrapped styles={styles} route={route} />
      </SafeAreaView>
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

function ConfirmationAlerts({ children }: { children: ReactNode }) {
  const alerts = useConfirmationAlerts();

  return (
    <AlertsContextProvider alerts={alerts}>{children}</AlertsContextProvider>
  );
}

function Loader() {
  const { styles } = useStyles(styleSheet, { isFullScreenConfirmation: true });
  const params = useParams<ConfirmationParams>();
  const loader = params?.loader ?? ConfirmationLoader.Default;

  if (loader === ConfirmationLoader.CustomAmount) {
    return (
      <InfoLoader testId="confirm-loader-custom-amount" loader={loader}>
        <CustomAmountInfoSkeleton />
      </InfoLoader>
    );
  }

  if (loader === ConfirmationLoader.PredictClaim) {
    return (
      <InfoLoader testId="confirm-loader-predict-claim" loader={loader}>
        <PredictClaimInfoSkeleton />
      </InfoLoader>
    );
  }

  if (loader === ConfirmationLoader.Transfer) {
    return (
      <InfoLoader testId="confirm-loader-transfer" loader={loader}>
        <TransferInfoSkeleton />
      </InfoLoader>
    );
  }

  return (
    <View style={styles.spinnerContainer} testID="confirm-loader-default">
      <AnimatedSpinner size={SpinnerSize.MD} />
    </View>
  );
}

function InfoLoader({
  children,
  testId,
  loader,
}: {
  children: ReactNode;
  testId?: string;
  loader: ConfirmationLoader;
}) {
  const { styles } = useStyles(styleSheet, { isFullScreenConfirmation: true });

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={styles.flatContainer}
      testID={testId}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {children}
      </ScrollView>
      {loader === ConfirmationLoader.Transfer && <FooterSkeleton />}
    </SafeAreaView>
  );
}

function useDisableScroll() {
  const transaction = useTransactionMetadataRequest();
  return hasTransactionType(transaction, TRANSACTION_TYPES_DISABLE_SCROLL);
}
