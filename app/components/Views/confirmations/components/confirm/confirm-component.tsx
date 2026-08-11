import React, { ReactNode, useEffect } from 'react';
import {
  BackHandler,
  StyleProp,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import { ConfirmationUIType } from '../../ConfirmationView.testIds';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../../component-library/hooks';
import { UnstakeConfirmationViewProps } from '../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import useConfirmationAlerts from '../../hooks/alerts/useConfirmationAlerts';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { AlertsContextProvider } from '../../context/alert-system-context';
import { ConfirmationContextProvider } from '../../context/confirmation-context';
import { QRHardwareContextProvider } from '../../context/qr-hardware-context';
import { useConfirmReject } from '../../hooks/useConfirmReject';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import { ConfirmationAssetPollingProvider } from '../confirmation-asset-polling-provider/confirmation-asset-polling-provider';
import AlertBanner from '../alert-banner';
import Info from '../info-root';
import Title from '../title';
import { Footer, FooterSkeleton } from '../footer';
import styleSheet from './confirm-component.styles';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useParams } from '../../../../../util/navigation/navUtils';
import AnimatedSpinner, { SpinnerSize } from '../../../../UI/AnimatedSpinner';
import {
  AdvancedCustomAmountInfoSkeleton,
  CustomAmountInfoSkeleton,
  PrefillCustomAmountInfoSkeleton,
} from '../info/custom-amount-info';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { PredictClaimInfoSkeleton } from '../info/predict-claim-info';
import { TransferInfoSkeleton } from '../info/transfer/transfer';
// TEMP perf (Remove before merge): single CTA->VISIBLE metric.
import { perfConfirmationVisible } from '../../utils/perf-marker';

const TRANSACTION_TYPES_DISABLE_SCROLL = [TransactionType.predictClaim];

const TRANSACTION_TYPES_DISABLE_ALERT_BANNER = [
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
];

export enum ConfirmationLoader {
  Default = 'default',
  CustomAmount = 'customAmount',
  AdvancedCustomAmount = 'advancedCustomAmount',
  PrefillCustomAmount = 'prefillCustomAmount',
  PredictClaim = 'predictClaim',
  Transfer = 'transfer',
}

export enum PayWithOption {
  MoneyAccount = 'money_account',
}

export interface ConfirmationParams {
  autoSelectFiatPayment?: boolean;
  loader?: ConfirmationLoader;
  maxValueMode?: boolean;
  forceBottomSheet?: boolean;
  payWithOption?: PayWithOption;
  preferredPaymentToken?: {
    address: Hex;
    chainId: Hex;
  };
}

/**
 * Route params accepted by the full-screen confirmation routes
 * (`RedesignedConfirmations` / `NoHeaderConfirmations`). This is a superset of
 * {@link ConfirmationParams} because different entry points pass extra,
 * feature-specific fields: `amount` (carried by some entry flows for display),
 * `showPerpsHeader` (Perps deposit+order flow renders a Perps header, read by
 * the Perps route's header options rather than the confirm component), and
 * `params` (legacy nested bag passed by some send flows).
 */
export interface FullScreenConfirmationParams extends ConfirmationParams {
  amount?: string;
  showPerpsHeader?: boolean;
  params?: ConfirmationParams;
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
          </QRHardwareContextProvider>
        </ConfirmationAlerts>
      </ConfirmationAssetPollingProvider>
    </ConfirmationContextProvider>
  );
};

interface ConfirmProps {
  route?: UnstakeConfirmationViewProps['route'];
  /** When true, disables SafeAreaView insets when confirmation is full screen. Defaults to false. */
  disableSafeArea?: boolean;
  /** Optional style applied to the full-screen confirmation container. */
  fullscreenStyle?: StyleProp<ViewStyle>;
}

interface ConfirmInternalProps extends ConfirmProps {
  approvalRequestType?: string;
}

/**
 * The confirmation shell that mounts only once an approval request exists.
 * Everything expensive lives here — `useFullScreenConfirmation`, styles — so it
 * never runs during the loader phase. Reject-only, so it uses the lightweight
 * `useConfirmReject` rather than the full `useConfirmActions` fan-out.
 */
const ConfirmInternal = ({
  approvalRequestType,
  route,
  disableSafeArea = false,
  fullscreenStyle,
}: ConfirmInternalProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { onReject } = useConfirmReject();
  const { styles } = useStyles(styleSheet, {
    isFullScreenConfirmation,
    disableSafeArea,
  });

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: true,
      headerShown: Boolean(isFullScreenConfirmation),
    });
  }, [isFullScreenConfirmation, navigation]);

  // Show confirmation in a flat container if the confirmation is full screen
  if (isFullScreenConfirmation) {
    return (
      <SafeAreaView
        edges={disableSafeArea ? [] : ['right', 'bottom', 'left']}
        style={[styles.flatContainer, fullscreenStyle]}
        testID={ConfirmationUIType.FLAT}
        onLayout={perfConfirmationVisible}
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
      <View
        testID={approvalRequestType}
        style={styles.confirmContainer}
        onLayout={perfConfirmationVisible}
      >
        <ConfirmWrapped styles={styles} route={route} />
      </View>
    </BottomSheet>
  );
};

export const Confirm = ({
  route,
  disableSafeArea = false,
  fullscreenStyle,
}: ConfirmProps) => {
  const { approvalRequest } = useApprovalRequest();
  const navigation = useNavigation<AppNavigationProp>();

  // While there is no approval request, keep the loading state in place and
  // disable the back gesture. The approvalRequest-present nav options
  // (headerShown / gestureEnabled) are set by ConfirmInternal so this effect
  // stays independent of the expensive isFullScreenConfirmation hook.
  useEffect(() => {
    if (!approvalRequest) {
      navigation.setOptions({ gestureEnabled: false });
    }
  }, [approvalRequest, navigation]);

  useEffect(() => {
    if (!approvalRequest) {
      const backHandlerSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        // Keep users on the loading state until there is an approval request that can be rejected.
        () => true,
      );

      return () => {
        backHandlerSubscription.remove();
      };
    }
  }, [approvalRequest]);

  // Show spinner if there is no approvalRequest. Crucially, none of the
  // expensive confirmation hooks (useConfirmActions -> useTransactionConfirm,
  // useFullScreenConfirmation -> useTransactionMetadataRequest, etc.) run on
  // this path — they are gated behind ConfirmInternal below.
  if (!approvalRequest) {
    return <Loader />;
  }

  return (
    <ConfirmInternal
      approvalRequestType={approvalRequest.type}
      route={route}
      disableSafeArea={disableSafeArea}
      fullscreenStyle={fullscreenStyle}
    />
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

  if (loader === ConfirmationLoader.AdvancedCustomAmount) {
    return (
      <InfoLoader
        testId="confirm-loader-advanced-custom-amount"
        loader={loader}
      >
        <AdvancedCustomAmountInfoSkeleton />
      </InfoLoader>
    );
  }

  if (loader === ConfirmationLoader.PrefillCustomAmount) {
    return (
      <InfoLoader testId="confirm-loader-prefill-custom-amount" loader={loader}>
        <PrefillCustomAmountInfoSkeleton />
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
