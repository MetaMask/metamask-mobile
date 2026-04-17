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
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { safeToChecksumAddress } from '../../../../../../util/address';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { useNeedsGasFaucet } from '../../../../../UI/Card/hooks/useNeedsGasFaucet';
import {
  selectCardDelegationState,
  resetDelegationState,
} from '../../../../../../core/redux/slices/card';
import NavigationService from '../../../../../../core/NavigationService/NavigationService';
import Routes from '../../../../../../constants/navigation/Routes';
import { BAANX_MAX_LIMIT } from '../../../../../UI/Card/constants';
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
  const { onConfirm, onReject } = useConfirmActions();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const transactionMetadata = useTransactionMetadataRequest();
  const delegationState = useSelector(selectCardDelegationState);
  const { selectedToken, limitType, customLimit, flow } = delegationState;

  const { needsFaucet } = useNeedsGasFaucet(selectedToken ?? undefined);

  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  // Prefetch delegation session as soon as footer mounts
  useEffect(() => {
    if (!selectedToken?.caipChainId) return;

    const userAccount = selectAccountByScope('eip155:0');
    const address = safeToChecksumAddress(userAccount?.address);
    if (!address) return;

    Engine.context.CardController.prefetchDelegationSession(
      selectedToken.caipChainId,
      address,
      needsFaucet,
    ).catch((error: Error) => {
      Logger.error(error, 'CardDelegationFooter: prefetch session failed');
    });
    // Mount only — session is short-lived, re-fetched on demand in handleConfirm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to delegation completed event for navigation/cleanup
  useEffect(
    () =>
      Engine.controllerMessenger.subscribe(
        'CardController:delegationCompleted',
        ({ flow: completedFlow }: { flow: string | null }) => {
          if (completedFlow === 'onboarding') {
            NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
              screen: Routes.CARD.HOME,
            } as never);
          }
          dispatch(resetDelegationState());
        },
      ),
    [dispatch],
  );

  const handleConfirm = useCallback(async () => {
    if (!selectedToken || !transactionMetadata?.id) return;

    const userAccount = selectAccountByScope('eip155:0');
    const address = safeToChecksumAddress(userAccount?.address);
    if (!address) {
      Logger.error(
        new Error('No EVM account found'),
        'CardDelegationFooter: handleConfirm',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const amount =
        limitType === 'full' ? BAANX_MAX_LIMIT : customLimit || '0';

      // Kick off SIWE signing + delegation listener registration (returns immediately
      // for EVM; awaits snap + confirmation for Solana)
      await Engine.context.CardController.prepareDelegationApproval({
        caipChainId: selectedToken.caipChainId ?? '',
        address,
        tokenSymbol: selectedToken.symbol ?? '',
        tokenMint:
          (selectedToken.stagingTokenAddress || selectedToken.address) ??
          undefined,
        delegationContract: selectedToken.delegationContract ?? undefined,
        amount,
        transactionId: transactionMetadata.id,
        flow,
        useGasFaucet: needsFaucet,
      });

      // Submit the queued EVM tx (navigates away via the standard confirmation flow)
      await onConfirm();
    } catch (error) {
      setIsSubmitting(false);
      Logger.error(
        error as Error,
        'CardDelegationFooter: handleConfirm failed',
      );
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('card.card_spending_limit.confirm_error') },
        ],
        iconName: IconName.Warning,
        iconColor: theme.colors.error.default,
        hasNoTimeout: false,
      });
    }
  }, [
    selectedToken,
    limitType,
    customLimit,
    flow,
    selectAccountByScope,
    needsFaucet,
    transactionMetadata?.id,
    onConfirm,
    toastRef,
    theme,
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
