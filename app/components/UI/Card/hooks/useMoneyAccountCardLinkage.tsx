import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
  Spinner,
} from '@metamask/design-system-react-native';
import type { MoneyAccount } from '@metamask/money-account-controller';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import {
  selectCardDelegationSettings,
  selectIsCardAuthenticated,
} from '../../../../selectors/cardController';
import { selectMoneyEnableMoneyAccountFlag } from '../../Money/selectors/featureFlags';
import {
  hasMoneyAccountCardRequirements,
  resolveMoneyAccountCardToken,
} from '../../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import useMoneyAccountBalance from '../../Money/hooks/useMoneyAccountBalance';
import { BAANX_MAX_LIMIT } from '../constants';
import { CardFundingToken } from '../types';
import { UserCancelledError } from './useCardDelegation';

export type LinkageStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'error'
  | 'cancelled';

export interface UseMoneyAccountCardLinkageReturn {
  hasMoneyAccountRequirements: boolean;
  isCardAuthenticated: boolean;
  primaryMoneyAccount: MoneyAccount | undefined;
  moneyAccountCardToken: CardFundingToken | null;
  canLink: boolean;
  isFunded: boolean;

  status: LinkageStatus;
  isLinking: boolean;
  error: Error | null;

  linkInBackground: () => Promise<boolean>;
  linkInteractive: (params: { amount: string }) => Promise<boolean>;
  reset: () => void;
}

/**
 * UI-only hook that wraps `CardController.linkMoneyAccountCard` and owns the
 * pending / success / error / cancel toasts.
 *
 * Business logic — on-chain signing, transaction submission, confirmation
 * waiting and provider reporting — lives entirely in the controller. This hook
 * is a thin orchestration layer for the screen wiring it.
 */
export const useMoneyAccountCardLinkage =
  (): UseMoneyAccountCardLinkageReturn => {
    const { toastRef } = useContext(ToastContext);
    const theme = useTheme();

    const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
    const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
    const isMoneyAccountEnabled = useSelector(
      selectMoneyEnableMoneyAccountFlag,
    );
    const isCardAuthenticated = useSelector(selectIsCardAuthenticated);
    const delegationSettings = useSelector(selectCardDelegationSettings);
    const { totalFiatRaw } = useMoneyAccountBalance();

    const [status, setStatus] = useState<LinkageStatus>('idle');
    const [error, setError] = useState<Error | null>(null);

    const moneyAccountCardToken = useMemo(
      () => resolveMoneyAccountCardToken(delegationSettings),
      [delegationSettings],
    );

    const hasRequirements = hasMoneyAccountCardRequirements({
      isMoneyAccountEnabled,
      vaultConfig,
      moneyAccountAddress: primaryMoneyAccount?.address,
    });

    const canLink = Boolean(
      hasRequirements && isCardAuthenticated && moneyAccountCardToken,
    );

    // Strict `> 0` derivation. Any non-zero balance counts as funded; a
    // dust/threshold refinement is intentionally deferred (see plan risks).
    const isFunded = useMemo(() => {
      if (!totalFiatRaw) return false;
      const parsed = Number(totalFiatRaw);
      return Number.isFinite(parsed) && parsed > 0;
    }, [totalFiatRaw]);

    const showPendingToast = useCallback(() => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('money.metamask_card.link_pending_title'),
            isBold: true,
          },
          { label: '\n', isBold: false },
          {
            label: strings('money.metamask_card.link_pending_description'),
            isBold: false,
          },
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
    }, [toastRef]);

    const showSuccessToast = useCallback(() => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('money.metamask_card.link_success_title'),
            isBold: true,
          },
          { label: '\n', isBold: false },
          {
            label: strings('money.metamask_card.link_success_description'),
            isBold: false,
          },
        ],
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hasNoTimeout: false,
      });
    }, [theme.colors.success.default, toastRef]);

    const showErrorToast = useCallback(() => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('money.metamask_card.link_error'), isBold: true },
        ],
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.error.muted,
        hasNoTimeout: false,
      });
    }, [theme.colors.error.default, theme.colors.error.muted, toastRef]);

    /**
     * Shared linkage runner. Both `linkInBackground` and `linkInteractive`
     * differ only in the amount passed to the controller (and the call
     * sites' UX framing); everything else — guard, status transitions, toast
     * surface, error/cancel handling — is identical.
     */
    const runLinkage = useCallback(
      async (delegationAmountHuman: string): Promise<boolean> => {
        if (!canLink || !primaryMoneyAccount?.address) {
          showErrorToast();
          return false;
        }

        setStatus('pending');
        setError(null);
        showPendingToast();

        try {
          await Engine.context.CardController.linkMoneyAccountCard({
            moneyAccountAddress: primaryMoneyAccount.address,
            delegationAmountHuman,
          });
          setStatus('success');
          showSuccessToast();
          return true;
        } catch (caught) {
          const linkageError =
            caught instanceof Error ? caught : new Error(String(caught));

          if (linkageError instanceof UserCancelledError) {
            setStatus('cancelled');
            return false;
          }

          Logger.error(linkageError, 'useMoneyAccountCardLinkage failed');
          setError(linkageError);
          setStatus('error');
          showErrorToast();
          return false;
        }
      },
      [
        canLink,
        primaryMoneyAccount?.address,
        showErrorToast,
        showPendingToast,
        showSuccessToast,
      ],
    );

    const linkInBackground = useCallback(
      (): Promise<boolean> => runLinkage(BAANX_MAX_LIMIT),
      [runLinkage],
    );

    const linkInteractive = useCallback(
      ({ amount }: { amount: string }): Promise<boolean> => runLinkage(amount),
      [runLinkage],
    );

    const reset = useCallback(() => {
      setStatus('idle');
      setError(null);
    }, []);

    return {
      hasMoneyAccountRequirements: hasRequirements,
      isCardAuthenticated,
      primaryMoneyAccount,
      moneyAccountCardToken,
      canLink,
      isFunded,

      status,
      isLinking: status === 'pending',
      error,

      linkInBackground,
      linkInteractive,
      reset,
    };
  };

export default useMoneyAccountCardLinkage;
