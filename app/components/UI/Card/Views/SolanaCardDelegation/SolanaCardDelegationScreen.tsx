import React, { useCallback, useContext, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import NavigationService from '../../../../../core/NavigationService/NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import {
  selectCardDelegationState,
  resetDelegationState,
} from '../../../../../core/redux/slices/card';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { useNeedsGasFaucet } from '../../hooks/useNeedsGasFaucet';
import { BAANX_MAX_LIMIT, SOLANA_CAIP_CHAIN_ID } from '../../constants';
import type { CaipChainId } from '@metamask/utils';
import {
  CardDelegationInfo,
  CardDelegationInfoSkeleton,
} from '../../../../Views/confirmations/components/info/card-delegation-info/card-delegation-info';

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  footer: {
    padding: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
});

export function SolanaCardDelegationScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);

  const delegationState = useSelector(selectCardDelegationState);
  const { selectedToken, limitType, customLimit, flow } = delegationState;

  const { needsFaucet } = useNeedsGasFaucet(selectedToken ?? undefined);
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefetch delegation session as soon as the token is known.
  // Fires when selectedToken.caipChainId first becomes available (during the
  // skeleton phase), so the faucet strategy can run before the user taps Confirm.
  useEffect(() => {
    if (!selectedToken?.caipChainId) return;

    const solanaAccount = selectAccountByScope(SOLANA_CAIP_CHAIN_ID);
    if (!solanaAccount?.address) return;

    Engine.context.CardController.prefetchDelegationSession(
      selectedToken.caipChainId as CaipChainId,
      solanaAccount.address,
      needsFaucet,
    ).catch((error: Error) => {
      Logger.error(
        error,
        'SolanaCardDelegationScreen: prefetch session failed',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken?.caipChainId]);

  // Navigate on delegation completion
  useEffect(
    () =>
      Engine.controllerMessenger.subscribe(
        'CardController:delegationCompleted',
        ({ flow: completedFlow }: { flow: string | null }) => {
          if (completedFlow === 'onboarding') {
            NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
              screen: Routes.CARD.HOME,
            } as never);
          } else {
            navigation.goBack();
          }
          dispatch(resetDelegationState());
        },
      ),
    [dispatch, navigation],
  );

  const handleConfirm = useCallback(async () => {
    if (!selectedToken) return;

    const solanaAccount = selectAccountByScope(SOLANA_CAIP_CHAIN_ID);
    if (!solanaAccount?.address) {
      Logger.error(
        new Error('No Solana account found'),
        'SolanaCardDelegationScreen: handleConfirm',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const amount =
        limitType === 'full' ? BAANX_MAX_LIMIT : customLimit || '0';

      await Engine.context.CardController.prepareDelegationApproval({
        caipChainId: selectedToken.caipChainId ?? '',
        address: solanaAccount.address,
        accountId: solanaAccount.id,
        tokenSymbol: selectedToken.symbol ?? '',
        tokenMint:
          (selectedToken.stagingTokenAddress || selectedToken.address) ??
          undefined,
        delegationContract: selectedToken.delegationContract ?? undefined,
        amount,
        transactionId: undefined,
        flow,
        useGasFaucet: needsFaucet,
      });
      // Navigation handled by delegationCompleted subscriber
    } catch (error) {
      setIsSubmitting(false);
      Logger.error(
        error as Error,
        'SolanaCardDelegationScreen: handleConfirm failed',
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
    }
  }, [
    selectedToken,
    limitType,
    customLimit,
    flow,
    selectAccountByScope,
    needsFaucet,
    toastRef,
    theme,
  ]);

  const handleCancel = useCallback(() => {
    dispatch(resetDelegationState());
    navigation.goBack();
  }, [dispatch, navigation]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedToken ? (
          <CardDelegationInfo />
        ) : (
          <CardDelegationInfoSkeleton />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <View style={styles.buttonWrapper}>
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
          <View style={styles.buttonWrapper}>
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
    </SafeAreaView>
  );
}
