import { useCallback, useContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { store } from '../../../../store';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import {
  selectCardDelegationSettings,
  selectIsCardAuthenticated,
} from '../../../../selectors/cardController';
import { selectMoneyEnableMoneyAccountFlag } from '../../Money/selectors/featureFlags';
import { BAANX_MAX_LIMIT, caipChainIdToNetwork } from '../constants';
import {
  hasMoneyAccountCardRequirements,
  resolveMoneyAccountCardToken,
} from '../util/moneyAccountCardToken';
import { useCardDelegation } from './useCardDelegation';

export const useMoneyAccountCardLinking = () => {
  const { toastRef } = useContext(ToastContext);
  const theme = useTheme();
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isCardAuthenticated = useSelector(selectIsCardAuthenticated);
  const delegationSettings = useSelector(selectCardDelegationSettings);
  const [isLinking, setIsLinking] = useState(false);

  const moneyAccountCardToken = useMemo(
    () => resolveMoneyAccountCardToken(delegationSettings),
    [delegationSettings],
  );

  const delegationSource = useMemo(
    () => ({
      type: 'moneyAccount' as const,
      address: moneyAccount?.address ?? '',
    }),
    [moneyAccount?.address],
  );

  const { submitDelegation } = useCardDelegation(moneyAccountCardToken, {
    source: delegationSource,
    approvalMode: 'background',
  });

  const hasMoneyAccountRequirements = hasMoneyAccountCardRequirements({
    isMoneyAccountEnabled,
    vaultConfig,
    moneyAccountAddress: moneyAccount?.address,
  });
  const canLink = Boolean(
    hasMoneyAccountRequirements && isCardAuthenticated && moneyAccountCardToken,
  );

  const showErrorToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [{ label: strings('money.metamask_card.link_error') }],
      iconName: IconName.Danger,
      iconColor: theme.colors.error.default,
      backgroundColor: theme.colors.error.muted,
      hasNoTimeout: false,
    });
  }, [theme, toastRef]);

  const linkMoneyAccountCard = useCallback(async (): Promise<boolean> => {
    if (!hasMoneyAccountRequirements || !isCardAuthenticated) {
      showErrorToast();
      return false;
    }

    setIsLinking(true);
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [{ label: strings('money.metamask_card.link_pending') }],
      iconName: IconName.Loading,
      hasNoTimeout: true,
    });

    try {
      let tokenToUse = moneyAccountCardToken;
      if (!tokenToUse) {
        await Engine.context.CardController.fetchCardHomeData();
        tokenToUse = resolveMoneyAccountCardToken(
          selectCardDelegationSettings(store.getState()),
        );
      }

      const network = tokenToUse
        ? caipChainIdToNetwork[tokenToUse.caipChainId]
        : null;

      if (!tokenToUse || !network) {
        throw new Error('Money Account Card spending token unavailable');
      }

      await submitDelegation(
        {
          amount: BAANX_MAX_LIMIT,
          currency: tokenToUse.symbol ?? '',
          network,
        },
        tokenToUse,
      );
      await Engine.context.CardController.fetchCardHomeData();

      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [{ label: strings('money.metamask_card.link_success') }],
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        backgroundColor: theme.colors.success.muted,
        hasNoTimeout: false,
      });
      return true;
    } catch (error) {
      Logger.error(error as Error, 'useMoneyAccountCardLinking failed');
      showErrorToast();
      return false;
    } finally {
      setIsLinking(false);
    }
  }, [
    hasMoneyAccountRequirements,
    isCardAuthenticated,
    showErrorToast,
    toastRef,
    moneyAccountCardToken,
    submitDelegation,
    theme,
  ]);

  return {
    canLink,
    hasMoneyAccountRequirements,
    isCardAuthenticated,
    isLinking,
    moneyAccount,
    moneyAccountCardToken,
    linkMoneyAccountCard,
  };
};
