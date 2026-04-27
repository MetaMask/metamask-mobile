import React, { useCallback, useContext, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import { strings } from '../../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../../util/theme';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { safeToChecksumAddress } from '../../../../../../util/address';
import { toTokenMinimalUnit } from '../../../../../../util/number';
import { encodeApproveTransaction } from '../../../../../UI/Card/util/encodeApproveTransaction';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { useNeedsGasFaucet } from '../../../../../UI/Card/hooks/useNeedsGasFaucet';
import {
  selectCardDelegationState,
  resetDelegationState,
  setDelegationSubmitting,
} from '../../../../../../core/redux/slices/card';
import NavigationService from '../../../../../../core/NavigationService/NavigationService';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  BAANX_MAX_LIMIT,
  SOLANA_CAIP_CHAIN_ID,
  isSolanaChain,
} from '../../../../../UI/Card/constants';
import type { CaipChainId } from '@metamask/utils';
import styleSheet from '../../footer/footer.styles';

const localStyles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
});

export function CardDelegationFooter() {
  const { styles } = useStyles(styleSheet, {
    isStakingConfirmationBool: false,
    isFullScreenConfirmation: true,
  });

  const theme = useTheme();
  const dispatch = useDispatch();
  const { toastRef } = useContext(ToastContext);
  const { onReject } = useConfirmActions();
  // Use the approval hook directly so accepting the queued tx does not trigger
  // the navigation side effects inside useTransactionConfirm. Navigation is
  // owned entirely by the delegationCompleted event handler below.
  const { onConfirm: onApprovalConfirm } = useApprovalRequest();

  const transactionMetadata = useTransactionMetadataRequest();
  const delegationState = useSelector(selectCardDelegationState);
  const { selectedToken, limitType, customLimit, flow, isSubmitting } =
    delegationState;

  const { needsFaucet } = useNeedsGasFaucet(selectedToken ?? undefined);

  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  // Prefetch delegation session as soon as footer mounts
  useEffect(() => {
    if (!selectedToken?.caipChainId) return;

    const caipChainId = selectedToken.caipChainId as CaipChainId | undefined;
    const scope = isSolanaChain(caipChainId)
      ? SOLANA_CAIP_CHAIN_ID
      : ('eip155:0' as const);
    const account = selectAccountByScope(scope);
    const address = isSolanaChain(caipChainId)
      ? account?.address
      : safeToChecksumAddress(account?.address);
    if (!address) return;

    Engine.context.CardController.prefetchDelegationSession(
      selectedToken.caipChainId,
      address,
      needsFaucet,
    ).catch((error: Error) => {
      Logger.error(error, 'CardDelegationFooter: prefetch session failed');
    });
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to delegation completed event for navigation/cleanup
  useEffect(
    () =>
      Engine.controllerMessenger.subscribe(
        'CardController:delegationCompleted',
        () => {
          NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
            screen: Routes.CARD.HOME,
          } as never);
          dispatch(resetDelegationState());
        },
      ),
    [dispatch],
  );

  // Subscribe to delegation failed event — show error toast and navigate away
  useEffect(
    () =>
      Engine.controllerMessenger.subscribe(
        'CardController:delegationFailed',
        () => {
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            labelOptions: [
              { label: strings('card.card_spending_limit.update_error') },
            ],
            iconName: IconName.Warning,
            iconColor: theme.colors.error.default,
            hasNoTimeout: false,
          });
          NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
            screen: Routes.CARD.HOME,
          } as never);
          dispatch(resetDelegationState());
        },
      ),
    [dispatch, toastRef, theme],
  );

  const handleConfirm = useCallback(async () => {
    if (!selectedToken) return;

    const caipChainId = selectedToken.caipChainId as CaipChainId | undefined;
    const isSolana = isSolanaChain(caipChainId);

    // EVM requires a pre-queued tx; Solana handles the full flow inline
    if (!isSolana && !transactionMetadata?.id) return;

    let address: string;
    let accountId: string | undefined;

    if (isSolana) {
      const solanaAccount = selectAccountByScope(SOLANA_CAIP_CHAIN_ID);
      if (!solanaAccount?.address) {
        Logger.error(
          new Error('No Solana account found'),
          'CardDelegationFooter: handleConfirm',
        );
        return;
      }
      address = solanaAccount.address;
      accountId = solanaAccount.id;
    } else {
      const userAccount = selectAccountByScope('eip155:0');
      const evmAddress = safeToChecksumAddress(userAccount?.address);
      if (!evmAddress) {
        Logger.error(
          new Error('No EVM account found'),
          'CardDelegationFooter: handleConfirm',
        );
        return;
      }
      address = evmAddress;
    }

    try {
      const amount =
        limitType === 'full' ? BAANX_MAX_LIMIT : customLimit || '0';

      dispatch(setDelegationSubmitting(true));

      // EVM: update queued tx data with final limit before submitting.
      // Done here (not on every selection) to avoid triggering gas re-estimation.
      if (
        !isSolana &&
        transactionMetadata?.id &&
        selectedToken?.delegationContract
      ) {
        const tokenAddress =
          selectedToken.stagingTokenAddress || selectedToken.address;
        if (tokenAddress) {
          const amountInMinimalUnits = toTokenMinimalUnit(
            amount,
            selectedToken.decimals ?? 18,
          ).toString();
          const transactionData = encodeApproveTransaction(
            selectedToken.delegationContract,
            amountInMinimalUnits,
          );
          Engine.context.TransactionController.updateTransaction(
            {
              ...transactionMetadata,
              txParams: {
                ...transactionMetadata.txParams,
                data: transactionData,
              },
            },
            'Card delegation limit update',
          );
        }
      }

      // EVM: registers tx listener (returns immediately) → onConfirm() submits the tx
      // Solana: awaits snap execution + MultichainTransactions confirmation inline
      await Engine.context.CardController.prepareDelegationApproval({
        caipChainId: selectedToken.caipChainId ?? '',
        address,
        accountId,
        tokenSymbol: selectedToken.symbol ?? '',
        tokenMint:
          (selectedToken.stagingTokenAddress || selectedToken.address) ??
          undefined,
        delegationContract: selectedToken.delegationContract ?? undefined,
        amount,
        transactionId: transactionMetadata?.id,
        flow,
        useGasFaucet: needsFaucet,
      });

      // Accept the pending approval (EVM: submits the queued tx;
      // Solana: accepts the placeholder approval created in useCardDelegationTransaction).
      // Navigation and error handling are driven by delegationCompleted /
      // delegationFailed events — do not block or navigate here.
      await onApprovalConfirm({
        waitForResult: false,
        deleteAfterResult: true,
        handleErrors: false,
      });
    } catch (error) {
      Logger.error(
        error as Error,
        'CardDelegationFooter: handleConfirm failed',
      );
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('card.card_spending_limit.update_error') },
        ],
        iconName: IconName.Warning,
        iconColor: theme.colors.error.default,
        hasNoTimeout: false,
      });
      dispatch(resetDelegationState());
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
      } as never);
    }
  }, [
    selectedToken,
    limitType,
    customLimit,
    flow,
    selectAccountByScope,
    needsFaucet,
    transactionMetadata,
    onApprovalConfirm,
    toastRef,
    theme,
    dispatch,
  ]);

  const handleCancel = useCallback(async () => {
    dispatch(resetDelegationState());
    await onReject();
  }, [dispatch, onReject]);

  return (
    <View style={styles.base}>
      <View style={localStyles.buttonRow}>
        <View style={localStyles.buttonWrapper}>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleCancel}
            isFullWidth
            isDisabled={isSubmitting}
          >
            {strings('card.card_spending_limit.cancel')}
          </Button>
        </View>
        <View style={localStyles.buttonWrapper}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleConfirm}
            isFullWidth
            isDisabled={isSubmitting || !selectedToken}
            isLoading={isSubmitting}
          >
            {strings('card.card_spending_limit.confirm_new_limit')}
          </Button>
        </View>
      </View>
    </View>
  );
}
