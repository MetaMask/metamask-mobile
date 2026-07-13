import { useCallback, useMemo } from 'react';
import { toHex } from '@metamask/controller-utils';
import { TextColor } from '@metamask/design-system-react-native';
import Logger from '../../../../util/Logger';
import { TokenI } from '../../Tokens/types';
import type { TokenListItemCta } from '../../Tokens/TokenList/TokenListItem/TokenListItem';
import { strings } from '../../../../../locales/i18n';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../constants/moneyEvents';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import useMoneyAccountBalance from './useMoneyAccountBalance';
import { useMoneyAnalytics } from './useMoneyAnalytics';
import { useMoneyCtaVisibility } from './useMoneyCtaVisibility';

/**
 * Provides Money Token List Item CTA and its deposit action.
 *
 * This hook is consumed once per list surface, avoiding per-row Money account
 * and analytics hook subscriptions.
 */
export const useMoneyTokenListCta = () => {
  const { shouldShowMoneyTokenListItemCta } = useMoneyCtaVisibility();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { apyPercent } = useMoneyAccountBalance();
  const { trackButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.WALLET_HOME,
    component_name: COMPONENT_NAMES.TOKEN_LIST_ITEM,
  });

  const label = useMemo(
    () =>
      apyPercent === undefined
        ? undefined
        : strings('money.token_list_cta.get_apy', { apy: apyPercent }),
    [apyPercent],
  );

  const handleMoneyTokenListItemCtaPress = useCallback(
    async (asset?: TokenI) => {
      if (!asset?.address || !asset.chainId || !label) {
        Logger.error(
          new Error('Asset, chain ID, or APY label is not set'),
          '[Money Account] Failed to initiate deposit from token list CTA',
        );
        return;
      }

      // TODO: Update event properties depending on whether the Money onboarding has been seen already.
      trackButtonClicked({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_en: label,
        label_localized: label,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });

      try {
        await initiateDeposit({
          preferredPaymentToken: {
            address: toHex(asset.address),
            chainId: toHex(asset.chainId),
          },
        });
      } catch (error) {
        Logger.error(
          error as Error,
          '[Money Account] Failed to initiate deposit from token list CTA',
        );
      }
    },
    [initiateDeposit, label, trackButtonClicked],
  );

  const tokenListItemCta = useMemo<TokenListItemCta | undefined>(
    () =>
      label
        ? {
            label,
            color: TextColor.SuccessDefault,
            shouldShow: shouldShowMoneyTokenListItemCta,
            onPress: handleMoneyTokenListItemCtaPress,
          }
        : undefined,
    [handleMoneyTokenListItemCtaPress, label, shouldShowMoneyTokenListItemCta],
  );

  return { tokenListItemCta };
};
