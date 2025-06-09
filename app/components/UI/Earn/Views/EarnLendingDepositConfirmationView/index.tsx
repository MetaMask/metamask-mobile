import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { isEmpty } from 'lodash';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Toast, {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import { TokenI } from '../../../Tokens/types';
import useEarnTokens from '../../hooks/useEarnTokens';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { EARN_LENDING_ACTIONS } from '../../types/lending.types';
import ConfirmationFooter from './components/ConfirmationFooter';
import DepositInfoSection from './components/DepositInfoSection';
import DepositReceiveSection from './components/DepositReceiveSection';
import Erc20TokenHero from './components/Erc20TokenHero';
import styleSheet from './EarnLendingDepositConfirmationView.styles';
import { parseFloatSafe } from '../../utils';
import {
  addCurrencySymbol,
  renderFromTokenMinimalUnit,
} from '../../../../../util/number';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';

export interface LendingDepositViewRouteParams {
  token?: TokenI;
  amountTokenMinimalUnit?: string;
  amountFiat?: string;
  annualRewardsToken?: string;
  annualRewardsFiat?: string;
  action?: Extract<EARN_LENDING_ACTIONS, 'ALLOWANCE_INCREASE' | 'DEPOSIT'>;
  lendingContractAddress?: string;
  lendingProtocol?: string;
}

export interface EarnLendingDepositConfirmationViewProps {
  route: RouteProp<{ params: LendingDepositViewRouteParams }, 'params'>;
}

const Steps = {
  ALLOWANCE_INCREASE: 0,
  DEPOSIT: 1,
};

const EarnLendingDepositConfirmationView = () => {
  const { styles, theme } = useStyles(styleSheet, {});
  const currentCurrency = useSelector(selectCurrentCurrency);
  const { params } =
    useRoute<EarnLendingDepositConfirmationViewProps['route']>();

  const {
    token,
    amountTokenMinimalUnit,
    amountFiat,
    lendingContractAddress,
    lendingProtocol,
    action,
  } = params;

  const navigation = useNavigation();

  getStakingNavbar(strings('earn.deposit'), navigation, theme.colors);

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(strings('earn.deposit'), navigation, theme.colors, {
        hasCancelButton: false,
        backgroundColor: theme.colors.background.alternative,
      }),
    );
  }, [navigation, theme.colors]);

  const [isConfirmButtonDisabled, setIsConfirmButtonDisabled] = useState(false);
  const [activeStep, setActiveStep] = useState(
    action === EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE
      ? Steps.ALLOWANCE_INCREASE
      : Steps.DEPOSIT,
  );
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [isDepositLoading, setIsDepositLoading] = useState(false);

  const activeAccount = useSelector(selectSelectedInternalAccount);
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const { getPairedEarnTokens } = useEarnTokens();
  const { toastRef } = useContext(ToastContext);

  const confirmButtonText = useMemo(
    () =>
      activeStep === Steps.ALLOWANCE_INCREASE
        ? strings('earn.approve')
        : strings('earn.confirm'),
    [activeStep],
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
        'TransactionController:transactionFailed',
        () => {
          setIsConfirmButtonDisabled(false);
          setIsApprovalLoading(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
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
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );
    },
    [showTransactionSubmissionToast],
  );

  const createDepositTxEventListeners = useCallback(
    (transactionId: string) => {
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
        () => {
          setIsConfirmButtonDisabled(false);
          setIsDepositLoading(false);
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
          navigation.navigate(Routes.TRANSACTIONS_VIEW);
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );
    },
    [navigation, showTransactionSubmissionToast],
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

  const { earnToken, outputToken } = getPairedEarnTokens(token);

  if (!earnToken) return null;

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleConfirm = async () => {
    try {
      const isSupportedLendingAction =
        action === EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE ||
        action === EARN_LENDING_ACTIONS.DEPOSIT;

      setIsConfirmButtonDisabled(true);

      // Guards
      if (
        !activeAccount?.address ||
        !earnToken?.chainId ||
        !isSupportedLendingAction ||
        !earnToken?.experience?.market?.protocol ||
        !earnToken?.experience?.market?.underlying?.address
      ) {
        setIsConfirmButtonDisabled(false);
        return;
      }

      // 1. Build Transaction

      const tokenContractAddress = earnToken?.address;

      if (!tokenContractAddress) return;
      const networkClientId =
        Engine.context.NetworkController.findNetworkClientIdByChainId(
          toHex(earnToken.chainId),
        );

      let txResult;
      // Requires allowance increase
      if (activeStep === Steps.ALLOWANCE_INCREASE) {
        setIsApprovalLoading(true);

        const allowanceIncreaseTransaction =
          await Engine.context.EarnController.executeLendingTokenApprove({
            protocol: earnToken?.experience?.market?.protocol,
            amount: amountTokenMinimalUnit,
            underlyingTokenAddress:
              earnToken?.experience?.market?.underlying?.address,
            gasOptions: {
              // gasLimit: 21596,
            },
            txOptions: {
              deviceConfirmedOn: WalletDevice.MM_MOBILE,
              networkClientId,
              origin: ORIGIN_METAMASK,
              type: TransactionType.tokenMethodIncreaseAllowance,
            },
          });

        if (!allowanceIncreaseTransaction) {
          setIsApprovalLoading(false);
          setIsConfirmButtonDisabled(false);
          return;
        }

        txResult = allowanceIncreaseTransaction;
      }
      // Already has necessary allowance and can deposit straight away.
      else {
        setIsDepositLoading(true);

        const depositTransaction =
          await Engine.context.EarnController.executeLendingDeposit({
            amount: amountTokenMinimalUnit,
            protocol: earnToken?.experience?.market?.protocol,
            underlyingTokenAddress:
              earnToken?.experience?.market?.underlying?.address,
            gasOptions: {
              // gasLimit: 60000,
            },
            txOptions: {
              deviceConfirmedOn: WalletDevice.MM_MOBILE,
              networkClientId,
              origin: ORIGIN_METAMASK,
              type: TransactionType.lendingDeposit,
            },
          });

        if (!depositTransaction) {
          setIsDepositLoading(false);
          setIsConfirmButtonDisabled(false);

          return;
        }

        txResult = depositTransaction;
      }

      const transactionId = txResult?.transactionMeta?.id;
      const txType = txResult?.transactionMeta?.type;

      if (!transactionId || !txType) {
        setIsConfirmButtonDisabled(false);
        return;
      }
      // 3. Setup Transaction Event Listeners
      createTransactionEventListeners(transactionId, txType);
    } catch (error) {
      console.error('error', error);
    }
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
          amountTokenMinimalUnit={amountTokenMinimalUnit}
          amountFiatNumber={parseFloatSafe(amountFiat)}
        />
        <DepositReceiveSection
          token={token}
          receiptTokenName={outputToken?.name || ''}
          receiptTokenAmount={
            renderFromTokenMinimalUnit(
              amountTokenMinimalUnit,
              earnToken.decimals,
            ) +
            ' ' +
            (outputToken?.ticker || outputToken?.symbol || '')
          }
          receiptTokenAmountFiat={addCurrencySymbol(
            amountFiat,
            currentCurrency,
          )}
        />
      </View>
      <ConfirmationFooter
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        buttonPrimary={{
          disabled: isConfirmButtonDisabled,
          text: confirmButtonText,
        }}
        progressBar={{
          activeStep,
          steps: [
            { label: strings('earn.approve'), isLoading: isApprovalLoading },
            { label: strings('earn.deposit'), isLoading: isDepositLoading },
          ],
        }}
      />
      <Toast ref={toastRef} />
    </View>
  );
};

export default EarnLendingDepositConfirmationView;
