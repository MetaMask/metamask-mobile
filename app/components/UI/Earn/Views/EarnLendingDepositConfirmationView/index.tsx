import React, { useCallback, useContext, useMemo, useState } from 'react';
import { View } from 'react-native';
import styleSheet from './EarnLendingDepositConfirmationView.styles';
import { useStyles } from '../../../../hooks/useStyles';
import Erc20TokenHero from './components/Erc20TokenHero';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { TokenI } from '../../../Tokens/types';
import BN from 'bnjs4';
import { isEmpty } from 'lodash';
import { EARN_INPUT_VIEW_ACTIONS } from '../EarnInputView/EarnInputView.types';
import useNavbar from '../../../../Views/confirmations/hooks/ui/useNavbar';
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

export interface LendingDepositViewRouteParams {
  token?: TokenI;
  amountTokenMinimalUnit?: string;
  amountFiat?: string;
  annualRewardsToken?: string;
  annualRewardsFiat?: BN;
  annualRewardRate?: string;
  action?: Extract<EARN_INPUT_VIEW_ACTIONS, 'ALLOWANCE_INCREASE' | 'LEND'>;
  lendingContractAddress?: string;
  lendingProtocol?: string;
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

// Temp: Contract addresses below will be replaced by earn-sdk/earn-controller in the next iteration.
const USDC_BASE_TOKEN_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// TODO: Remove hardcoded variables before opening PR.
const USDC_MAINNET_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const DAI_MAINNET_TOKEN_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Temp: Contract map will be replaced by earn-sdk/earn-contorller in the next iteration.
const stablecoinTokenContractAddressMap = {
  '0x1': {
    DAI: DAI_MAINNET_TOKEN_ADDRESS,
    USDC: USDC_MAINNET_TOKEN_ADDRESS,
  },
  '0x2105': {
    USDC: USDC_BASE_TOKEN_ADDRESS,
  },
};

const AAVE_V3_POOL_CONTRACT_ADDRESS =
  '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';

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
  } = params;

  useNavbar(strings('earn.deposit'));

  const navigation = useNavigation();

  const [isConfirmButtonDisabled, setIsConfirmButtonDisabled] = useState(false);
  const [activeStep, setActiveStep] = useState(
    action === EARN_INPUT_VIEW_ACTIONS.ALLOWANCE_INCREASE
      ? Steps.ALLOWANCE_INCREASE
      : Steps.DEPOSIT,
  );
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [isDepositLoading, setIsDepositLoading] = useState(false);

  const activeAccount = useSelector(selectSelectedInternalAccount);

  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();

  const { toastRef } = useContext(ToastContext);

  const confirmButtonText = useMemo(
    () => (activeStep === Steps.ALLOWANCE_INCREASE ? 'Approve' : 'Confirm'),
    [activeStep],
  );

  // TODO: Replace hardcoded strings
  const showTransactionSubmissionToast = useCallback(() => {
    const baseMessage = 'Transaction Submitted';
    const prefix =
      activeStep === Steps.ALLOWANCE_INCREASE ? 'Approval' : 'Deposit';

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Check,
      iconColor: theme.colors.success.default,
      backgroundColor: theme.colors.background.default,
      labelOptions: [
        {
          label: `${prefix} ${baseMessage}`,
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

      if (transactionType === TransactionType.lendingDeposit) {
        createDepositTxEventListeners(transactionId);
      }
    },
    [createAllowanceTxEventListeners, createDepositTxEventListeners],
  );

  // Route param guards
  // TODO: Re-evaluate if these are necessary. Ideally we shouldn't navigate to this page if route params are missing to begin with.
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

    const tokenContractAddress =
      // @ts-expect-error sanity testing.
      stablecoinTokenContractAddressMap[earnToken?.chainId][earnToken?.symbol];

    if (activeStep === Steps.ALLOWANCE_INCREASE) {
      const allowanceIncreaseTransaction =
        generateLendingAllowanceIncreaseTransaction(
          amountTokenMinimalUnit,
          activeAccount.address,
          tokenContractAddress,
          AAVE_V3_POOL_CONTRACT_ADDRESS,
          earnToken.chainId,
        );

      txParams = allowanceIncreaseTransaction.txParams;
      txOptions = allowanceIncreaseTransaction.txOptions;

      setIsApprovalLoading(true);
    } else {
      // Already has necessary allowance and can deposit straight away.
      const depositTransaction = generateLendingDepositTransaction(
        amountTokenMinimalUnit,
        activeAccount.address,
        tokenContractAddress,
        AAVE_V3_POOL_CONTRACT_ADDRESS,
        earnToken.chainId,
      );

      txParams = depositTransaction.txParams;
      txOptions = depositTransaction.txOptions;

      setIsDepositLoading(true);
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

    // 3. Setup Transaction Event Listeners
    createTransactionEventListeners(transactionId, txType);
  };

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
          //   TODO: Replace hardcoded strings with locale variables
          { label: 'Approve', isLoading: isApprovalLoading },
          { label: 'Deposit', isLoading: isDepositLoading },
        ]}
      />
      <Toast ref={toastRef} />
    </View>
  );
};

export default EarnLendingDepositConfirmationView;
