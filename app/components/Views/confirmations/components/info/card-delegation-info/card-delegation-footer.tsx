import React, { useCallback, useContext, useEffect, useState } from 'react';
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
import { useCardSDK } from '../../../../../UI/Card/sdk';
import { useNeedsGasFaucet } from '../../../../../UI/Card/hooks/useNeedsGasFaucet';
import {
  selectCardDelegationState,
  setDelegationCompleted,
  resetDelegationState,
} from '../../../../../../core/redux/slices/card';
import ReduxService from '../../../../../../core/redux';
import NavigationService from '../../../../../../core/NavigationService/NavigationService';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  caipChainIdToNetwork,
  BAANX_MAX_LIMIT,
} from '../../../../../UI/Card/constants';
import { generateSignatureMessage } from '../../../../../UI/Card/util/delegation';
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
  const { sdk } = useCardSDK();

  const transactionMetadata = useTransactionMetadataRequest();
  const delegationState = useSelector(selectCardDelegationState);
  const { selectedToken, limitType, customLimit, flow } = delegationState;

  const { needsFaucet } = useNeedsGasFaucet(selectedToken ?? undefined);

  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefetchedToken, setPrefetchedToken] = useState<{
    jwt: string;
    nonce: string;
  } | null>(null);

  // Prefetch delegation token as soon as footer mounts
  useEffect(() => {
    if (!sdk || !selectedToken) return;

    const network = selectedToken.caipChainId
      ? caipChainIdToNetwork[selectedToken.caipChainId]
      : null;
    if (!network) return;

    const userAccount = selectAccountByScope('eip155:0');
    const address = safeToChecksumAddress(userAccount?.address);
    if (!address) return;

    sdk
      .generateDelegationToken(network, address, needsFaucet)
      .then(({ token: jwt, nonce }) => {
        setPrefetchedToken({ jwt, nonce });
      })
      .catch((error) => {
        Logger.error(
          error,
          'CardDelegationFooter: Failed to prefetch delegation token',
        );
      });
    // Only run on mount — re-fetched on demand in handleConfirm if not ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!sdk || !selectedToken) return;

    const network = selectedToken.caipChainId
      ? caipChainIdToNetwork[selectedToken.caipChainId]
      : null;

    if (!network) {
      Logger.error(
        new Error('Unsupported network for card delegation'),
        'CardDelegationFooter: Missing network',
      );
      return;
    }

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
      // Use prefetched token or fetch fresh
      let jwt: string;
      let nonce: string;

      if (prefetchedToken) {
        jwt = prefetchedToken.jwt;
        nonce = prefetchedToken.nonce;
      } else {
        const { token, nonce: n } = await sdk.generateDelegationToken(
          network,
          address,
          needsFaucet,
        );
        jwt = token;
        nonce = n;
      }

      const signatureMessage = generateSignatureMessage(
        address,
        nonce,
        network,
        selectedToken.caipChainId,
      );

      const signature =
        await Engine.context.KeyringController.signPersonalMessage({
          data: '0x' + Buffer.from(signatureMessage, 'utf8').toString('hex'),
          from: address,
        });

      // Capture all closure values needed by the detached listener
      const txId = transactionMetadata?.id;
      const capturedToken = selectedToken;
      const capturedLimitType = limitType;
      const capturedCustomLimit = customLimit;
      const capturedFlow = flow;
      const capturedNetwork = network;
      const capturedAddress = address;
      const capturedSdk = sdk;

      // Register a fire-and-forget listener on the Engine messenger.
      // This is intentionally NOT inside a useEffect so it persists beyond
      // the component's lifecycle (the confirmation screen navigates away
      // before the transaction is mined).
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        async (meta) => {
          try {
            if (capturedSdk && meta.hash) {
              await capturedSdk.completeDelegation({
                address: capturedAddress,
                network: capturedNetwork,
                currency: capturedToken.symbol?.toLowerCase() ?? '',
                amount:
                  capturedLimitType === 'full'
                    ? BAANX_MAX_LIMIT
                    : capturedCustomLimit || '0',
                txHash: meta.hash,
                sigHash: signature,
                sigMessage: signatureMessage,
                token: jwt,
              });
            }

            await Engine.context.CardController.fetchCardHomeData();

            if (capturedFlow !== 'onboarding') {
              // Signal CardHome to show a success toast
              ReduxService.store.dispatch(setDelegationCompleted(true));
            } else {
              // For onboarding, navigate to CardHome
              NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
                screen: Routes.CARD.HOME,
              } as never);
            }
          } catch (error) {
            Logger.error(
              error as Error,
              'CardDelegationFooter: completeDelegation failed after tx confirmed',
            );
          } finally {
            ReduxService.store.dispatch(resetDelegationState());
          }
        },
        (meta) => meta.id === txId,
      );

      // Submit the approval — navigates away via goBack() (cardDelegation is in GO_BACK_TYPES)
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
    sdk,
    selectedToken,
    limitType,
    customLimit,
    flow,
    selectAccountByScope,
    needsFaucet,
    prefetchedToken,
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
