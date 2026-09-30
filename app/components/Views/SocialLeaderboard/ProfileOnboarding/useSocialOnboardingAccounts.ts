import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectInternalEvmAccounts } from '../../../../selectors/accountsController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectEVMEnabledNetworks } from '../../../../selectors/networkEnablementController';
import { useGetFormattedTokensPerChain } from '../../../hooks/useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../../../hooks/useGetTotalFiatBalanceCrossChains';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';
import { renderShortAddress } from '../../../../util/address';

export interface SocialOnboardingAccount {
  id: string;
  name: string;
  address: string;
  balanceLabel: string;
}

const accountLabel = (name: string | undefined, address: string): string =>
  name?.trim() ? name : renderShortAddress(address);

/**
 * EVM wallet accounts the profile can link, with fiat totals from the same
 * balance hooks the portfolio uses.
 *
 * Those hooks are EVM-only and checksum each address, so non-EVM accounts are
 * left out. The hook runs when onboarding mounts, before the link-account step.
 */
export const useSocialOnboardingAccounts = (): SocialOnboardingAccount[] => {
  const accounts = useSelector(selectInternalEvmAccounts);
  const enabledChains = useSelector(selectEVMEnabledNetworks);
  const currency = useSelector(selectCurrentCurrency);
  const formattedTokens = useGetFormattedTokensPerChain(
    accounts,
    true,
    enabledChains,
  );
  const totals = useGetTotalFiatBalanceCrossChains(accounts, formattedTokens);

  return useMemo(
    () =>
      accounts.map((account) => {
        const fiat = totals[account.address]?.totalFiatBalance;
        const currencyCode = (currency || 'usd').toUpperCase();
        const balanceLabel =
          typeof fiat === 'number'
            ? formatWithThreshold(fiat, 0.01, I18n.locale, {
                style: 'currency',
                currency: currencyCode,
              })
            : '';

        return {
          id: account.id,
          name: accountLabel(account.metadata.name, account.address),
          address: account.address,
          balanceLabel,
        };
      }),
    [accounts, currency, totals],
  );
};
