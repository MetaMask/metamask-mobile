import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
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
import { capitalize } from '../../../../../util/general';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { RootState } from '../../../../../reducers';
import { Hex } from '@metamask/utils';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { IMetaMetricsEvent } from '../../../../../core/Analytics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';

export interface LendingDepositViewRouteParams {
  token?: TokenI;
  amountTokenMinimalUnit?: string;
  amountFiat?: string;
  annualRewardsToken?: string;
  annualRewardsFiat?: string;
  action?: Extract<EARN_LENDING_ACTIONS, 'ALLOWANCE_INCREASE' | 'DEPOSIT'>;
  lendingContractAddress?: string;
  lendingProtocol?: string;
  networkName?: string;
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
  const { trackEvent, createEventBuilder } = useMetrics();

  getStakingNavbar(strings('earn.deposit'), navigation, theme.colors);

  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token?.chainId as Hex),
  );

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

  const confirmButtonText = useMemo(
    () =>
      activeStep === Steps.ALLOWANCE_INCREASE
        ? strings('earn.approve')
        : strings('earn.confirm'),
    [activeStep],
  );

  const { earnToken, outputToken } = getPairedEarnTokens(token as TokenI);

  const getTrackEventProperties = useCallback(
    (
      actionType: string,
      transactionId?: string,
      transactionType?: TransactionType,
    ) => {
      const properties: {
        action_type: string;
        token: string | undefined;
        network: string | undefined;
        user_token_balance: string | undefined;
        transaction_value: string;
        experience: EARN_EXPERIENCES;
        transaction_id?: string;
        transaction_type?: string;
      } = {
        action_type: actionType,
        token: token?.symbol,
        network: network?.name,
        user_token_balance: earnToken?.balanceFormatted,
        transaction_value: `${renderFromTokenMinimalUnit(
          amountTokenMinimalUnit ?? '0',
          earnToken?.decimals as number,
        )} ${earnToken?.symbol}`,
        experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
      };

      if (transactionId) {
        properties.transaction_id = transactionId;
      }

      if (transactionType) {
        properties.transaction_type = transactionType;
      }

      return properties;
    },
    [
      token?.symbol,
      network?.name,
      earnToken?.balanceFormatted,
      earnToken?.decimals,
      earnToken?.symbol,
      amountTokenMinimalUnit,
    ],
  );

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

  const emitTxMetaMetric = useCallback(
    (txType: TransactionType) =>
      (transactionId: string) =>
      (event: IMetaMetricsEvent) => {
        trackEvent(
          createEventBuilder(event)
            .addProperties(
              getTrackEventProperties('deposit', transactionId, txType),
            )
            .build(),
        );
      },
    [createEventBuilder, getTrackEventProperties, trackEvent],
  );

  const createAllowanceTxEventListeners = useCallback(
    (transactionId: string) => {
      const emitAllowanceTxMetaMetric = emitTxMetaMetric(
        TransactionType.tokenMethodIncreaseAllowance,
      )(transactionId);

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionSubmitted',
        () => {
          emitAllowanceTxMetaMetric(
            MetaMetricsEvents.EARN_TRANSACTION_SUBMITTED,
          );
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionDropped',
        () => {
          setIsConfirmButtonDisabled(false);
          setIsApprovalLoading(false);
          emitAllowanceTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_DROPPED);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        () => {
          emitAllowanceTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_FAILED);
          setIsConfirmButtonDisabled(false);
          setIsApprovalLoading(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
        () => {
          emitAllowanceTxMetaMetric(
            MetaMetricsEvents.EARN_TRANSACTION_REJECTED,
          );
          setIsConfirmButtonDisabled(false);
          setIsApprovalLoading(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          setIsConfirmButtonDisabled(false);
          setIsApprovalLoading(false);
          setActiveStep(Steps.DEPOSIT);
          emitAllowanceTxMetaMetric(
            MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED,
          );
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );
    },
    [emitTxMetaMetric],
  );

  const createDepositTxEventListeners = useCallback(
    (transactionId: string) => {
      const emitDepositTxMetaMetric = emitTxMetaMetric(
        TransactionType.lendingDeposit,
      )(transactionId);

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionDropped',
        () => {
          setIsConfirmButtonDisabled(false);
          setIsDepositLoading(false);
          emitDepositTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_DROPPED);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
        () => {
          setIsConfirmButtonDisabled(false);
          setIsDepositLoading(false);
          emitDepositTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_REJECTED);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionSubmitted',
        () => {
          emitDepositTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_SUBMITTED);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          emitDepositTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED);
          navigation.navigate(Routes.TRANSACTIONS_VIEW);
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        () => {
          setIsConfirmButtonDisabled(false);
          setIsDepositLoading(false);
          emitDepositTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_FAILED);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
    },
    [emitTxMetaMetric, navigation],
  );

  const createTransactionEventListeners = useCallback(
    (transactionId: string, transactionType: string) => {
      if (!transactionId || !transactionType) return;

      // Transaction Initiated but not submitted, rejected, or approved yet.
      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_INITIATED)
          .addProperties(
            getTrackEventProperties(
              'deposit',
              transactionId,
              transactionType as TransactionType,
            ),
          )
          .build(),
      );

      if (transactionType === TransactionType.tokenMethodIncreaseAllowance) {
        createAllowanceTxEventListeners(transactionId);
      }

      if (transactionType === TransactionType.lendingDeposit) {
        createDepositTxEventListeners(transactionId);
      }
    },
    [
      createAllowanceTxEventListeners,
      createDepositTxEventListeners,
      createEventBuilder,
      getTrackEventProperties,
      trackEvent,
    ],
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

  if (!earnToken) return null;

  const handleCancel = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_DEPOSIT_REVIEW_CANCEL_CLICKED)
        .addProperties({
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          text: 'Cancel',
          location: EVENT_LOCATIONS.EARN_LENDING_DEPOSIT_CONFIRMATION_VIEW,
          network: network?.name,
          step:
            activeStep === Steps.ALLOWANCE_INCREASE
              ? 'Allowance increase'
              : 'Deposit',
        })
        .build(),
    );

    navigation.goBack();
  };

  const handleConfirm = async () => {
    try {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.EARN_DEPOSIT_REVIEW_CONFIRM_CLICKED,
        )
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            text: 'Confirm',
            location: EVENT_LOCATIONS.EARN_LENDING_DEPOSIT_CONFIRMATION_VIEW,
            network: network?.name,
            step:
              activeStep === Steps.ALLOWANCE_INCREASE
                ? 'Allowance increase'
                : 'Deposit',
          })
          .build(),
      );

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
            gasOptions: {},
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
      // allow user to try again
      setIsDepositLoading(false);
      setIsConfirmButtonDisabled(false);
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
          lendingProtocol={capitalize(
            lendingProtocol ?? strings('earn.unknown'),
          )}
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
    </View>
  );
};

export default EarnLendingDepositConfirmationView;
