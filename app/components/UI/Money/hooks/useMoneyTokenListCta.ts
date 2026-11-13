import { useCallback, useMemo } from 'react';
import { toHex } from '@metamask/controller-utils';
import { TextColor } from '@metamask/design-system-react-native';
import BigNumber from 'bignumber.js';
import Logger from '../../../../util/Logger';
import { TokenI } from '../../Tokens/types';
import type { TokenListItemCta } from '../../Tokens/TokenList/TokenListItem/TokenListItem';
import { strings } from '../../../../../locales/i18n';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../constants/moneyEvents';
import useMoneyVaultApy from './useMoneyVaultApy';
import { useMoneyAnalytics } from './useMoneyAnalytics';
import { useMoneyCtaVisibility } from './useMoneyCtaVisibility';
import { useMoneyCtaDepositNavigation } from './useMoneyDepositNavigation';

const TOKEN_LIST_CTA_LABEL_KEY = 'money.token_list_cta.get_apy';

/**
 * Provides Money Token List Item CTA and its deposit action.
 *
 * This hook is consumed once per list surface, avoiding per-row Money account
 * and analytics hook subscriptions.
 */
export const useMoneyTokenListCta = (screenName: SCREEN_NAMES) => {
  const { shouldShowMoneyTokenListItemCta } = useMoneyCtaVisibility();
  const { navigateToMoneyDeposit } = useMoneyCtaDepositNavigation();
  const { apyPercent } = useMoneyVaultApy();
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

      const tokenChainId = asset.chainId;
      const preferredPaymentToken = {
        address: toHex(asset.address),
        chainId: toHex(tokenChainId),
      };
      try {
        await navigateToMoneyDeposit({
          preferredPaymentToken,
          track: ({ redirect_target, button_intent }) => {
            trackTokenButtonClicked({
              button_type: MONEY_BUTTON_TYPES.TEXT,
              button_intent,
              label_en: englishLabel,
              label_localized: localizedLabel,
              redirect_target,
              token_symbol: asset.symbol,
              token_position_in_list: context.tokenPositionInList,
              token_chain_id: tokenChainId,
              tokens_in_list: context.tokensInList,
              token_has_balance: new BigNumber(asset.balance).gt(0),
            });
          },
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
      localizedLabel,
      navigateToMoneyDeposit,
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
