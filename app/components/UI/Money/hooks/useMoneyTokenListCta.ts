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
import { useMoneyOnboardingNavigation } from './useMoneyNavigation';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';

const TOKEN_LIST_CTA_LABEL_KEY = 'money.token_list_cta.get_apy';

/**
 * Provides Money Token List Item CTA and its deposit action.
 *
 * This hook is consumed once per list surface, avoiding per-row Money account
 * and analytics hook subscriptions.
 */
export const useMoneyTokenListCta = (screenName: SCREEN_NAMES) => {
  const { shouldShowMoneyTokenListItemCta } = useMoneyCtaVisibility();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { redirectToOnboardingIfNeeded } = useMoneyOnboardingNavigation();
  const { apyPercent } = useMoneyAccountBalance();
  const { trackTokenButtonClicked } = useMoneyAnalytics({
    screen_name: screenName,
    component_name: COMPONENT_NAMES.MONEY_TOKEN_LIST_ITEM_CTA,
  });

  const localizedLabel = useMemo(
    () =>
      apyPercent === undefined
        ? undefined
        : strings(TOKEN_LIST_CTA_LABEL_KEY, { apy: apyPercent }),
    [apyPercent],
  );

  const englishLabel = useMemo(
    () =>
      apyPercent === undefined
        ? undefined
        : strings(TOKEN_LIST_CTA_LABEL_KEY, { apy: apyPercent, locale: 'en' }),
    [apyPercent],
  );

  const handleMoneyTokenListItemCtaPress = useCallback(
    async (
      asset?: TokenI,
      context?: { tokenPositionInList: number; tokensInList: number },
    ) => {
      if (
        !asset?.address ||
        !asset.chainId ||
        !localizedLabel ||
        !englishLabel ||
        !context
      ) {
        Logger.error(
          new Error('Asset, chain ID, APY label, or token context is not set'),
          '[Money Account] Failed to initiate deposit from token list CTA',
        );
        return;
      }

      const preferredPaymentToken = {
        address: toHex(asset.address),
        chainId: toHex(asset.chainId),
      };
      const redirectedToOnboarding = redirectToOnboardingIfNeeded({
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
          preferredPaymentToken,
        },
      });

      trackTokenButtonClicked({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: redirectedToOnboarding
          ? MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING
          : MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_en: englishLabel,
        label_localized: localizedLabel,
        redirect_target: redirectedToOnboarding
          ? SCREEN_NAMES.MONEY_ONBOARDING
          : SCREEN_NAMES.MONEY_DEPOSIT,
        token_symbol: asset.symbol,
        token_position_in_list: context.tokenPositionInList,
        token_chain_id: asset.chainId,
        tokens_in_list: context.tokensInList,
      });

      if (redirectedToOnboarding) {
        return;
      }

      try {
        await initiateDeposit({
          preferredPaymentToken,
        });
      } catch (error) {
        Logger.error(
          error as Error,
          '[Money Account] Failed to initiate deposit from token list CTA',
        );
      }
    },
    [
      englishLabel,
      initiateDeposit,
      localizedLabel,
      redirectToOnboardingIfNeeded,
      trackTokenButtonClicked,
    ],
  );

  const tokenListItemCta = useMemo<TokenListItemCta | undefined>(
    () =>
      localizedLabel
        ? {
            label: localizedLabel,
            color: TextColor.SuccessDefault,
            shouldShow: shouldShowMoneyTokenListItemCta,
            onPress: handleMoneyTokenListItemCtaPress,
          }
        : undefined,
    [
      handleMoneyTokenListItemCtaPress,
      localizedLabel,
      shouldShowMoneyTokenListItemCta,
    ],
  );

  return { tokenListItemCta };
};
