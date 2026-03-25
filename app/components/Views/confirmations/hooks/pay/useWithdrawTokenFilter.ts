import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { EthAccountType } from '@metamask/keyring-api';
import { isNativeAddress } from '@metamask/bridge-controller';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  getPostQuoteTransactionType,
  isTransactionPayWithdraw,
} from '../../utils/transaction';
import { selectPayQuoteConfig } from '../../../../../selectors/featureFlagController/confirmations';
import { useSendTokens } from '../send/useSendTokens';
import { AssetType, TokenStandard } from '../../types/token';
import { RootState } from '../../../../../reducers';
import { useERC20Tokens } from '../../../../hooks/DisplayName/useERC20Tokens';
import { NameType } from '../../../../UI/Name/Name.types';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import I18n from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { getNetworkBadgeSource } from '../../utils/network';

/**
 * Returns a token filter for withdraw transactions, following the same pattern
 * as `usePerpsBalanceTokenFilter` and `useMusdConversionTokens`.
 *
 * Wallet tokens matching the allowlist are returned via `tokenFilter` delegation
 * to `useSendTokens`. For allowlisted tokens the user does not hold, metadata
 * is fetched from the tokens API so they still appear as zero-balance options.
 */
export function useWithdrawTokenFilter(): (tokens: AssetType[]) => AssetType[] {
  const transactionMeta = useTransactionMetadataRequest();
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const transactionType = getPostQuoteTransactionType(transactionMeta);
  const config = useSelector((state: RootState) =>
    selectPayQuoteConfig(state, transactionType),
  );
  const fiatCurrency = useSelector(selectCurrentCurrency);
  const allowlist = config.tokens;
  const shouldEnrich = isWithdraw && Boolean(allowlist);

  const tokenFilter = useMemo(() => {
    if (!allowlist) {
      return undefined;
    }
    const lookup = buildAllowlistLookup(allowlist);
    return (chainId: string, address: string) =>
      lookup.get(chainId.toLowerCase())?.has(address.toLowerCase()) ?? false;
  }, [allowlist]);

  const walletTokens = useSendTokens({
    includeNoBalance: shouldEnrich,
    tokenFilter,
  });

  const allowlistRequests = useMemo(() => {
    if (!shouldEnrich || !allowlist) return [];
    return Object.entries(allowlist).flatMap(([chainId, addresses]) =>
      addresses
        .filter((addr) => !isNativeAddress(addr.toLowerCase()))
        .map((addr) => ({
          type: NameType.EthereumAddress,
          value: addr,
          variation: chainId,
        })),
    );
  }, [shouldEnrich, allowlist]);

  const apiTokenResults = useERC20Tokens(allowlistRequests);

  const enriched = useMemo(() => {
    if (!shouldEnrich) return undefined;

    const walletKeys = new Set(
      walletTokens.map(
        (t) => `${t.chainId?.toLowerCase()}:${(t.address ?? '').toLowerCase()}`,
      ),
    );

    let zeroFiat: string;
    try {
      zeroFiat = getIntlNumberFormatter(I18n.locale, {
        style: 'currency',
        currency: fiatCurrency,
        minimumFractionDigits: 0,
      }).format(0);
    } catch {
      zeroFiat = `0 ${fiatCurrency}`;
    }

    const apiEntries = allowlistRequests
      .map((req, idx) => {
        const key = `${(req.variation as string).toLowerCase()}:${req.value.toLowerCase()}`;
        if (walletKeys.has(key)) return undefined;
        const data = apiTokenResults[idx];
        if (!data?.name && !data?.symbol) return undefined;
        const chainId = req.variation as Hex;
        return {
          address: req.value.toLowerCase(),
          chainId,
          accountType: EthAccountType.Eoa,
          name: data.name ?? '',
          symbol: data.symbol ?? '',
          decimals: data.decimals ?? 18,
          image: data.image ?? '',
          logo: data.image ?? undefined,
          balance: '0',
          balanceInSelectedCurrency: zeroFiat,
          isETH: false,
          isNative: false,
          networkBadgeSource: getNetworkBadgeSource(chainId),
          standard: TokenStandard.ERC20,
        } as AssetType;
      })
      .filter((t): t is AssetType => t !== undefined);

    return [...walletTokens, ...apiEntries];
  }, [
    walletTokens,
    shouldEnrich,
    allowlistRequests,
    apiTokenResults,
    fiatCurrency,
  ]);

  return useCallback(
    (tokens: AssetType[]): AssetType[] => {
      if (!isWithdraw || !enriched) {
        return tokens;
      }
      return enriched;
    },
    [isWithdraw, enriched],
  );
}

/**
 * Pre-computes a Map<chainId, Set<address>> from the allowlist for O(1) lookups.
 * Expands zero-address entries to also include the chain-specific native address.
 */
function buildAllowlistLookup(
  allowlist: Record<Hex, Hex[]>,
): Map<string, Set<string>> {
  const lookup = new Map<string, Set<string>>();

  for (const [chainId, addresses] of Object.entries(allowlist)) {
    const lowerChainId = chainId.toLowerCase();
    const addressSet = new Set<string>();

    for (const addr of addresses) {
      const lowerAddr = addr.toLowerCase();
      addressSet.add(lowerAddr);

      if (isNativeAddress(lowerAddr)) {
        const nativeAddr = getNativeTokenAddress(lowerChainId as Hex);
        addressSet.add(nativeAddr.toLowerCase());
      }
    }

    lookup.set(lowerChainId, addressSet);
  }

  return lookup;
}
