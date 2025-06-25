import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { capitalize } from '../../../../../util/general';
import {
  addCurrencySymbol,
  renderFromTokenMinimalUnit,
} from '../../../../../util/number';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakingNavbar } from '../../../Navbar';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { TokenI } from '../../../Tokens/types';
import useEarnToken from '../../hooks/useEarnToken';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { EARN_LENDING_ACTIONS } from '../../types/lending.types';
import { parseFloatSafe, tokenRequiresAllowanceReset } from '../../utils';
import ConfirmationFooter from './components/ConfirmationFooter';
import DepositInfoSection from './components/DepositInfoSection';
import DepositReceiveSection from './components/DepositReceiveSection';
import Erc20TokenHero from './components/Erc20TokenHero';
import styleSheet from './EarnLendingDepositConfirmationView.styles';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { RootState } from '../../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { IMetaMetricsEvent } from '../../../../../core/Analytics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import { ProgressStep } from './components/ProgressStepper';

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
  allowanceMinimalTokenUnit?: string;
}

export interface EarnLendingDepositConfirmationViewProps {
  route: RouteProp<{ params: LendingDepositViewRouteParams }, 'params'>;
}

const Steps = {
  ALLOWANCE_RESET: 0,
  ALLOWANCE_INCREASE: 1,
  DEPOSIT: 2,
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
    allowanceMinimalTokenUnit,
  } = params;

  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  getStakingNavbar(strings('earn.deposit'), navigation, theme.colors);

  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token?.chainId as Hex),
  );

  const [isConfirmButtonDisabled, setIsConfirmButtonDisabled] = useState(false);
  // TODO: Add loading state for allowance reset step.
  const [isAllowanceResetLoading, setIsAllowanceResetLoading] = useState(false);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [isDepositLoading, setIsDepositLoading] = useState(false);

  console.log('isAllowanceResetLoading: ', isAllowanceResetLoading);

  const activeAccount = useSelector(selectSelectedInternalAccount);
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const { earnToken, outputToken, getTokenSnapshot, tokenSnapshot } =
    useEarnToken(token as TokenI);

  const needsTokenAllowanceReset = useMemo(() => {
    if (!earnToken?.chainId || !earnToken?.symbol) return false;
    return (
      tokenRequiresAllowanceReset(earnToken.chainId, earnToken.symbol) &&
      // If allowance is zero we can simply increase allowance in a single transaction
      allowanceMinimalTokenUnit !== '0'
    );
  }, [allowanceMinimalTokenUnit, earnToken?.chainId, earnToken?.symbol]);

  console.log('needsTokenAllowanceReset:', needsTokenAllowanceReset);

  const [activeStep, setActiveStep] = useState(() => {
    if (
      action === EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE &&
      needsTokenAllowanceReset
    )
      return Steps.ALLOWANCE_RESET;
    if (action === EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE)
      return Steps.ALLOWANCE_INCREASE;
    return Steps.DEPOSIT;
  });

  console.log('activeStep:', activeStep);

  const confirmButtonText = useMemo(() => {
    switch (activeStep) {
      case 0:
        return 'Reset Allowance';
      case 1:
        return strings('earn.approve');
      case 2:
        return strings('earn.confirm');
    }
  }, [activeStep]);

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
        isAllowanceReset?: boolean;
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
        isAllowanceReset:
          transactionType === TransactionType.tokenMethodIncreaseAllowance &&
          allowanceMinimalTokenUnit !== '0',
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
      allowanceMinimalTokenUnit,
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

  const createResetTokenAllowanceTxEventListeners = (
    transactionId: string,
  ): Promise<boolean> => {
    const emitAllowanceTxMetaMetric = emitTxMetaMetric(
      TransactionType.tokenMethodIncreaseAllowance,
    )(transactionId);

    // TODO: Re-evaluate loading states. We want 1 confirmation click for token allowance reset edge case.
    return new Promise((resolve, reject) => {
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
          emitAllowanceTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_DROPPED);
          setIsConfirmButtonDisabled(false);
          setIsAllowanceResetLoading(false);
          reject(new Error('Allowance reset transaction dropped'));
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        () => {
          emitAllowanceTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_FAILED);
          setIsConfirmButtonDisabled(false);
          setIsAllowanceResetLoading(false);
          reject(new Error('Allowance reset transaction failed'));
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
          setIsAllowanceResetLoading(false);
          reject(new Error('Allowance reset transaction rejected'));
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          emitAllowanceTxMetaMetric(
            MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED,
          );
          setActiveStep(Steps.ALLOWANCE_INCREASE);
          setIsAllowanceResetLoading(false);
          resolve(true);
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );
    });
  };
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
          navigation.navigate(Routes.TRANSACTIONS_VIEW);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          emitDepositTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED);
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

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          if (!outputToken) {
            const networkClientId =
              Engine.context.NetworkController.findNetworkClientIdByChainId(
                tokenSnapshot?.chainId as Hex,
              );
            Engine.context.TokensController.addToken({
              decimals: tokenSnapshot?.token?.decimals || 0,
              symbol: tokenSnapshot?.token?.symbol || '',
              address: tokenSnapshot?.token?.address || '',
              name: tokenSnapshot?.token?.name || '',
              networkClientId,
            }).catch((error) => {
              console.error(
                error,
                'error adding counter-token on confirmation',
              );
            });
          }
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );
    },
    [emitTxMetaMetric, navigation, outputToken, tokenSnapshot],
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

  const progressBarSteps: ProgressStep[] = useMemo(() => {
    const defaultSteps = [
      { label: strings('earn.approve'), isLoading: isApprovalLoading },
      { label: strings('earn.deposit'), isLoading: isDepositLoading },
    ];

    if (needsTokenAllowanceReset) {
      return [
        {
          label: strings('earn.allowance_reset'),
          isLoading: isAllowanceResetLoading,
        },
        ...defaultSteps,
      ];
    }

    return defaultSteps;
  }, [
    isAllowanceResetLoading,
    isApprovalLoading,
    isDepositLoading,
    needsTokenAllowanceReset,
  ]);

  console.log('progressBarSteps: ', progressBarSteps);
  console.log('progressBarSteps.length: ', progressBarSteps.length);

  useEffect(() => {
    if (!outputToken) {
      getTokenSnapshot(
        earnToken?.chainId as Hex,
        earnToken?.experience.market?.outputToken?.address as Hex,
      );
    }
  }, [outputToken, getTokenSnapshot, earnToken]);

  // Route param guards
  if (
    isEmpty(token) ||
    !earnToken ||
    !amountTokenMinimalUnit ||
    !amountFiat ||
    !lendingContractAddress ||
    !lendingProtocol ||
    !action
  )
    return null;

  const getActiveStepAnalyticsLabel = () => {
    switch (activeStep) {
      case 0:
        return 'Allowance reset';

      case 1:
        return 'Allowance increase';

      case 2:
        return 'Deposit';
    }
  };

  const handleCancel = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_DEPOSIT_REVIEW_CANCEL_CLICKED)
        .addProperties({
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          text: 'Cancel',
          location: EVENT_LOCATIONS.EARN_LENDING_DEPOSIT_CONFIRMATION_VIEW,
          network: network?.name,
          step: getActiveStepAnalyticsLabel(),
        })
        .build(),
    );

    navigation.goBack();
  };

  // TODO: Add tests
  // Sets the allowance to zero for a given token.
  const resetTokenAllowance = async (networkClientId: string) => {
    try {
      if (
        !earnToken?.chainId ||
        !earnToken?.symbol ||
        !earnToken?.experience?.market?.protocol ||
        !earnToken?.experience?.market?.underlying.address
      )
        return;

      setIsAllowanceResetLoading(true);

      const allowanceResetTransaction =
        await Engine.context.EarnController.executeLendingTokenApprove({
          protocol: earnToken?.experience?.market?.protocol,
          amount: '0',
          underlyingTokenAddress:
            earnToken?.experience?.market?.underlying?.address,
          gasOptions: {
            // 65,000 + 20% buffer
            gasLimit: 78000,
          },
          txOptions: {
            deviceConfirmedOn: WalletDevice.MM_MOBILE,
            networkClientId,
            origin: ORIGIN_METAMASK,
            type: TransactionType.tokenMethodIncreaseAllowance,
          },
        });

      if (!allowanceResetTransaction?.transactionMeta?.id) {
        setIsAllowanceResetLoading(false);
        setIsConfirmButtonDisabled(false);
        return;
      }

      const transactionId = allowanceResetTransaction.transactionMeta.id;

      const didTxConfirm = await createResetTokenAllowanceTxEventListeners(
        transactionId,
      );

      if (!didTxConfirm) {
        setIsAllowanceResetLoading(false);
        setIsConfirmButtonDisabled(false);
      }
    } catch (e) {
      setIsAllowanceResetLoading(false);
      setIsConfirmButtonDisabled(false);
    }
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
            step: getActiveStepAnalyticsLabel(),
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

      console.log('[onConfirm] activeStep: ', activeStep);

      // TODO: Cleanup handler code
      // Edge Case: Some tokens (e.g. mainnet USDT) require resetting the token allowance to zero before it can be increase/set again.
      if (activeStep === Steps.ALLOWANCE_RESET) {
        await resetTokenAllowance(networkClientId);
      } else if (activeStep === Steps.ALLOWANCE_INCREASE) {
        setIsApprovalLoading(true);

        const allowanceIncreaseTransaction =
          await Engine.context.EarnController.executeLendingTokenApprove({
            protocol: earnToken?.experience?.market?.protocol,
            amount: amountTokenMinimalUnit,
            underlyingTokenAddress:
              earnToken?.experience?.market?.underlying?.address,
            gasOptions: {
              gasLimit: 78000,
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
        // TODO: Breakout into separate handler to make main handleConfirm more readable.
        setIsDepositLoading(true);

        const depositTransaction =
          await Engine.context.EarnController.executeLendingDeposit({
            amount: amountTokenMinimalUnit,
            protocol: earnToken?.experience?.market?.protocol,
            underlyingTokenAddress:
              earnToken?.experience?.market?.underlying?.address,
            gasOptions: {},
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
      // allow user to try again
      setIsDepositLoading(false);
      setIsConfirmButtonDisabled(false);
    }
  };

  // TODO: FIGURE OUT WHY DEPOSIT STEP IS LOADING!!!!

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
          receiptTokenName={
            outputToken?.name || tokenSnapshot?.token.name || ''
          }
          receiptTokenAmount={
            renderFromTokenMinimalUnit(
              amountTokenMinimalUnit,
              earnToken.decimals,
            ) +
            ' ' +
            (outputToken?.ticker ||
              outputToken?.symbol ||
              tokenSnapshot?.token.symbol ||
              '')
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
          // Needs to subtract 1 since only 2/3 possible steps are rendered when !needsTokenAllowanceReset
          activeStep: needsTokenAllowanceReset ? activeStep : activeStep - 1,
          steps: progressBarSteps,
        }}
      />
    </View>
  );
};

export default EarnLendingDepositConfirmationView;
