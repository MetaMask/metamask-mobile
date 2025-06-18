import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { View } from 'react-native';
import styleSheet from './EarnLendingDepositConfirmationView.styles';
import { useStyles } from '../../../../hooks/useStyles';
import Erc20TokenHero from './components/Erc20TokenHero';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { TokenI } from '../../../Tokens/types';
import { isEmpty } from 'lodash';
import { EARN_INPUT_VIEW_ACTIONS } from '../EarnInputView/EarnInputView.types';
import { strings } from '../../../../../../locales/i18n';
import DepositInfoSection from './components/DepositInfoSection';
import DepositReceiveSection from './components/DepositReceiveSection';
import DepositFooter from './components/DepositFooter';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import {
  generateLendingAllowanceIncreaseTransaction,
  generateLendingDepositTransaction,
} from '../../utils/tempLending';
import {
  TransactionParams,
  TransactionType,
} from '@metamask/transaction-controller';
import { useEarnTokenDetails } from '../../hooks/useEarnTokenDetails';
import Engine from '../../../../../core/Engine';
import Toast, {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { getStakingNavbar } from '../../../Navbar';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';

export interface LendingDepositViewRouteParams {
  token?: TokenI;
  amountTokenMinimalUnit?: string;
  amountFiat?: string;
  annualRewardsToken?: string;
  annualRewardsFiat?: string;
  action?: Extract<EARN_INPUT_VIEW_ACTIONS, 'ALLOWANCE_INCREASE' | 'LEND'>;
  lendingContractAddress?: string;
  lendingProtocol?: string;
  networkName?: string;
}

export interface EarnLendingDepositConfirmationViewProps {
  route: RouteProp<{ params: LendingDepositViewRouteParams }, 'params'>;
}

const MOCK_DATA_TO_REPLACE = {
  RECEIPT_TOKEN_NAME: 'Aave v3 USDC Coin',
  RECEIPT_TOKEN_AMOUNT: {
    FIAT: '$10,000.00',
    TOKEN: '10,100 AETHUSDC',
  },
};

const Steps = {
  ALLOWANCE_INCREASE: 0,
  DEPOSIT: 1,
};

const EarnLendingDepositConfirmationView = () => {
  const { styles, theme } = useStyles(styleSheet, {});

  const { params } =
    useRoute<EarnLendingDepositConfirmationViewProps['route']>();

  const {
    token,
    amountTokenMinimalUnit,
    amountFiat,
    lendingContractAddress,
    lendingProtocol,
    action,
    networkName,
  } = params;

  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  getStakingNavbar(strings('earn.deposit'), navigation, theme.colors);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_CONFIRMATION_PAGE_VIEWED)
        .addProperties(getTrackEventProperties('deposit'))
        .build(),
    );

    navigation.setOptions(
      getStakingNavbar(strings('earn.deposit'), navigation, theme.colors, {
        hasCancelButton: false,
        backgroundColor: theme.colors.background.alternative,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, theme.colors]);

  const [isConfirmButtonDisabled, setIsConfirmButtonDisabled] = useState(false);
  const [activeStep, setActiveStep] = useState(
    action === EARN_INPUT_VIEW_ACTIONS.ALLOWANCE_INCREASE
      ? Steps.ALLOWANCE_INCREASE
      : Steps.DEPOSIT,
  );
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [isDepositLoading, setIsDepositLoading] = useState(false);

  const activeAccount = useSelector(selectSelectedInternalAccount);
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();

  const { toastRef } = useContext(ToastContext);

  // Route param guards
  if (
    isEmpty(token) ||
    !amountTokenMinimalUnit ||
    !amountFiat ||
    !lendingContractAddress ||
    !lendingProtocol ||
    !action
  )
    return null;

  const earnToken = getTokenWithBalanceAndApr(token);

  const confirmButtonText = useMemo(
    () =>
      activeStep === Steps.ALLOWANCE_INCREASE
        ? strings('earn.approve')
        : strings('earn.confirm'),
    [activeStep],
  );

    const getTrackEventProperties = useCallback(
    (action: string, transactionId?: string) => {
      const baseProperties = {
        action_type: action,
        token: token?.symbol,
        network: networkName,
        user_token_balance: earnToken?.balanceFormatted,
        transaction_value: amountFiat,
      };
      
      if (transactionId) {
        return {
          ...baseProperties,
          transaction_id: transactionId,
        };
      }
      
      return baseProperties;
    },
    [amountFiat, networkName, token?.symbol, earnToken?.balanceFormatted],
  );

  const showTransactionSubmissionToast = useCallback(() => {
    const prefix =
      activeStep === Steps.ALLOWANCE_INCREASE
        ? strings('earn.approval')
        : strings('earn.deposit');

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Check,
      iconColor: theme.colors.success.default,
      backgroundColor: theme.colors.background.default,
      labelOptions: [
        {
          label: `${prefix} ${strings('earn.transaction_submitted')}`,
          isBold: false,
        },
      ],
      hasNoTimeout: false,
    });
  }, [
    activeStep,
    theme.colors.background.default,
    theme.colors.success.default,
    toastRef,
  ]);

  const createAllowanceTxEventListeners = useCallback(
    (transactionId: string) => {
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
        () => {
          setIsConfirmButtonDisabled(false);
          setIsApprovalLoading(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionSubmitted',
        () => {
          showTransactionSubmissionToast();
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          setIsConfirmButtonDisabled(false);
          setIsApprovalLoading(false);
          setActiveStep(Steps.DEPOSIT);
          trackEvent(
            createEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_APPROVED)
              .addProperties(getTrackEventProperties('deposit', transactionId))
              .build(),
          );
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );
    },
    [
      showTransactionSubmissionToast,
      trackEvent,
      createEventBuilder,
      getTrackEventProperties,
    ],
  );

  const createDepositTxEventListeners = useCallback(
    (transactionId: string) => {
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
        () => {
          setIsConfirmButtonDisabled(false);
          setIsDepositLoading(false);
          trackEvent(
            createEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_REJECTED)
              .addProperties(getTrackEventProperties('deposit', transactionId))
              .build(),
          );
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionSubmitted',
        () => {
          showTransactionSubmissionToast();
          trackEvent(
            createEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_SUBMITTED)
              .addProperties(getTrackEventProperties('deposit', transactionId))
              .build(),
          );
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED)
              .addProperties(getTrackEventProperties('deposit', transactionId))
              .build(),
          );
          navigation.navigate(Routes.TRANSACTIONS_VIEW);
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        () => {
          setIsConfirmButtonDisabled(false);
          setIsDepositLoading(false);
          trackEvent(
            createEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_FAILED)
              .addProperties(getTrackEventProperties('deposit', transactionId))
              .build(),
          );
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
    },
    [
      navigation,
      showTransactionSubmissionToast,
      trackEvent,
      createEventBuilder,
      getTrackEventProperties,
    ],
  );

  const createTransactionEventListeners = useCallback(
    (transactionId: string, transactionType: string) => {
      if (!transactionId || !transactionType) return;

      if (transactionType === TransactionType.tokenMethodIncreaseAllowance) {
        createAllowanceTxEventListeners(transactionId);
      }

      // TEMP: The lendingDeposit TransactionType has been added to the TransactionController but not released yet.
      // if (transactionType === TransactionType.lendingDeposit) {
      if (transactionType === 'lendingDeposit') {
        createDepositTxEventListeners(transactionId);
      }
    },
    [createAllowanceTxEventListeners, createDepositTxEventListeners],
  );

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleConfirm = async () => {
    const isSupportedLendingAction =
      action === EARN_INPUT_VIEW_ACTIONS.ALLOWANCE_INCREASE ||
      action === EARN_INPUT_VIEW_ACTIONS.LEND;

    setIsConfirmButtonDisabled(true);

    // Guards
    if (
      !activeAccount?.address ||
      !earnToken?.chainId ||
      !isSupportedLendingAction
    ) {
      setIsConfirmButtonDisabled(false);
      return;
    }

    // 1. Build Transaction
    let txParams: TransactionParams;
    let txOptions;

    const tokenContractAddress = earnToken?.address;

    if (!tokenContractAddress) return;

    // Requires allowance increase
    if (activeStep === Steps.ALLOWANCE_INCREASE) {
      const allowanceIncreaseTransaction =
        generateLendingAllowanceIncreaseTransaction(
          amountTokenMinimalUnit,
          activeAccount.address,
          tokenContractAddress,
          earnToken.chainId,
        );

      if (!allowanceIncreaseTransaction) return;

      txParams = allowanceIncreaseTransaction.txParams;
      txOptions = allowanceIncreaseTransaction.txOptions;

      setIsApprovalLoading(true);
    }
    // Already has necessary allowance and can deposit straight away.
    else {
      const depositTransaction = generateLendingDepositTransaction(
        amountTokenMinimalUnit,
        activeAccount.address,
        tokenContractAddress,
        earnToken.chainId,
      );

      if (!depositTransaction) return;

      txParams = depositTransaction.txParams;
      txOptions = depositTransaction.txOptions;

      setIsDepositLoading(true);

      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_ACTION_SUBMITTED)
          .addProperties(getTrackEventProperties('deposit'))
          .build(),
      );
    }

    // 2. Add Transaction
    const txRes = await Engine.context.TransactionController.addTransaction(
      txParams,
      txOptions,
    ).catch(() => {
      if (activeStep === Steps.ALLOWANCE_INCREASE) {
        setIsApprovalLoading(false);
      }
      if (activeStep === Steps.DEPOSIT) {
        setIsDepositLoading(false);
      }
      setIsConfirmButtonDisabled(false);
    });

    const transactionId = txRes?.transactionMeta?.id;
    const txType = txRes?.transactionMeta?.type;

    if (!transactionId || !txType) {
      setIsConfirmButtonDisabled(false);
      return;
    }

    if (txType === TransactionType.lendingDeposit) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_INITIATED)
          .addProperties(getTrackEventProperties('deposit', transactionId))
          .build(),
      );
    }

    // 3. Setup Transaction Event Listeners
    createTransactionEventListeners(transactionId, txType);
  };

  if (!isStablecoinLendingEnabled) {
    return null;
  }

  return (
    <View style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <Erc20TokenHero
          token={token}
          amountTokenMinimalUnit={amountTokenMinimalUnit}
          fiatValue={amountFiat}
        />
        <DepositInfoSection
          token={token}
          lendingContractAddress={lendingContractAddress}
          lendingProtocol={lendingProtocol}
        />
        <DepositReceiveSection
          token={token}
          // TODO: Replace MOCK_DATA before launch
          receiptTokenName={MOCK_DATA_TO_REPLACE.RECEIPT_TOKEN_NAME}
          receiptTokenAmount={MOCK_DATA_TO_REPLACE.RECEIPT_TOKEN_AMOUNT.TOKEN}
          receiptTokenAmountFiat={
            MOCK_DATA_TO_REPLACE.RECEIPT_TOKEN_AMOUNT.FIAT
          }
        />
      </View>
      <DepositFooter
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        buttonPrimary={{
          disabled: isConfirmButtonDisabled,
          text: confirmButtonText,
        }}
        activeStep={activeStep}
        steps={[
          { label: strings('earn.approve'), isLoading: isApprovalLoading },
          { label: strings('earn.deposit'), isLoading: isDepositLoading },
        ]}
      />
      <Toast ref={toastRef} />
    </View>
  );
};

export default EarnLendingDepositConfirmationView;
