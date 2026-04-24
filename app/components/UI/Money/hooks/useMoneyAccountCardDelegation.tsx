import React, { useCallback, useContext, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { useCardHomeData } from '../../Card/hooks/useCardHomeData';
import { useEnsureCardNetworkExists } from '../../Card/hooks/useEnsureCardNetworkExists';
import { BAANX_MAX_LIMIT, cardNetworkInfos } from '../../Card/constants';
import { findMonadUsdcDelegation } from '../../../../core/Engine/controllers/card-controller/utils/findMonadUsdcDelegation';
import Engine from '../../../../core/Engine';
import { store } from '../../../../store';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import {
  selectIsCardAuthenticated,
  selectCardDelegationSettings,
} from '../../../../selectors/cardController';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useAppThemeFromContext } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import type { DelegationSettingsResponse } from '../../Card/types';

export interface UseMoneyAccountCardDelegationResult {
  canEnable: boolean;
  isLoading: boolean;
  enableMoneyAccountOnCard: () => Promise<void>;
  revokeMoneyAccountOnCard: () => Promise<void>;
}

/**
 * Money account on Card: uses card home delegation settings (useCardHomeData),
 * ensures Monad in the network list, then runs CardController delegation
 * (no approval modal; Predict-style pending toast).
 */
export function useMoneyAccountCardDelegation(): UseMoneyAccountCardDelegationResult {
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();
  const { refetch: refetchCardHome } = useCardHomeData();
  const { ensureNetworkExists } = useEnsureCardNetworkExists();
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const isCardAuthenticated = useSelector(selectIsCardAuthenticated);
  const delegationSettings = useSelector(selectCardDelegationSettings);
  const [isLoading, setIsLoading] = useState(false);

  const canEnable = Boolean(
    moneyAccount?.address &&
      isCardAuthenticated &&
      findMonadUsdcDelegation(delegationSettings) !== null,
  );

  const resolveDelegationSettings =
    useCallback(async (): Promise<DelegationSettingsResponse | null> => {
      let settings = selectCardDelegationSettings(store.getState());
      if (settings?.networks?.length) {
        return settings;
      }
      await refetchCardHome();
      settings = selectCardDelegationSettings(store.getState());
      return settings?.networks?.length ? settings : null;
    }, [refetchCardHome]);

  const runMoneyAccountDelegation = useCallback(
    async (
      humanDelegationAmount: string,
      labels: {
        pendingTitle: string;
        pendingDescription: string;
        success: string;
        error: string;
      },
      logContext: string,
    ) => {
      if (!moneyAccount?.address) {
        return;
      }
      setIsLoading(true);
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: labels.pendingTitle, isBold: true },
          { label: '\n', isBold: false },
          { label: labels.pendingDescription, isBold: false },
        ],
        iconName: IconName.Loading,
        hasNoTimeout: true,
        startAccessory: (
          <Box twClassName="pr-3">
            <Spinner
              color={ReactNativeDsIconColor.PrimaryDefault}
              spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }}
            />
          </Box>
        ),
      });
      try {
        const settings = await resolveDelegationSettings();
        if (!settings || !findMonadUsdcDelegation(settings)) {
          Logger.error(
            new Error('Missing Monad USDC in delegation settings'),
            'useMoneyAccountCardDelegation',
          );
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            labelOptions: [{ label: labels.error }],
            iconName: IconName.Danger,
            iconColor: theme.colors.error.default,
            backgroundColor: theme.colors.error.muted,
            hasNoTimeout: false,
          });
          return;
        }
        await ensureNetworkExists(cardNetworkInfos.monad.caipChainId);
        await Engine.context.CardController.enableMoneyAccountOnCard(
          moneyAccount.address,
          settings,
          { delegationAmountHuman: humanDelegationAmount },
        );
        await refetchCardHome();
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [{ label: labels.success }],
          iconName: IconName.Confirmation,
          iconColor: theme.colors.success.default,
          backgroundColor: theme.colors.success.muted,
          hasNoTimeout: false,
        });
      } catch (e) {
        Logger.error(
          e as Error,
          `useMoneyAccountCardDelegation: ${logContext} failed`,
        );
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [{ label: labels.error }],
          iconName: IconName.Danger,
          iconColor: theme.colors.error.default,
          backgroundColor: theme.colors.error.muted,
          hasNoTimeout: false,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      moneyAccount?.address,
      ensureNetworkExists,
      resolveDelegationSettings,
      refetchCardHome,
      theme.colors,
      toastRef,
    ],
  );

  const enableMoneyAccountOnCard = useCallback(
    () =>
      runMoneyAccountDelegation(
        BAANX_MAX_LIMIT,
        {
          pendingTitle: strings('money.metamask_card.enable_pending_title'),
          pendingDescription: strings(
            'money.metamask_card.enable_pending_description',
          ),
          success: strings('money.metamask_card.enable_success'),
          error: strings('money.metamask_card.enable_error'),
        },
        'enable',
      ),
    [runMoneyAccountDelegation],
  );

  const revokeMoneyAccountOnCard = useCallback(
    () =>
      runMoneyAccountDelegation(
        '0',
        {
          pendingTitle: strings(
            'money.metamask_card.debug_revoke_pending_title',
          ),
          pendingDescription: strings(
            'money.metamask_card.debug_revoke_pending_description',
          ),
          success: strings('money.metamask_card.debug_revoke_success'),
          error: strings('money.metamask_card.debug_revoke_error'),
        },
        'revoke',
      ),
    [runMoneyAccountDelegation],
  );

  return {
    canEnable,
    isLoading,
    enableMoneyAccountOnCard,
    revokeMoneyAccountOnCard,
  };
}
