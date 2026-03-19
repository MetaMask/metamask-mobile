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
 * Wallet tokens matching the allowlist are used directly. For allowlisted tokens
 * the user does not hold, metadata is fetched from the tokens API so they still
 * appear as zero-balance options in the picker.
 */
export function useWithdrawTokenFilter(): (tokens: AssetType[]) => AssetType[] {
  const transactionMeta = useTransactionMetadataRequest();
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const transactionType = getPostQuoteTransactionType(transactionMeta);
  const config = useSelector((state: RootState) =>
    selectPayQuoteConfig(state, transactionType),
  );
  const fiatCurrency = useSelector(selectCurrentCurrency);
  const walletTokens = useSendTokens({ includeNoBalance: true });
  const allowlist = config.tokens;

  // Build requests for allowlisted ERC20 tokens only (skip native addresses).
  // Gate on isWithdraw to avoid unnecessary API calls for other transaction types.
  const allowlistRequests = useMemo(() => {
    if (!isWithdraw || !allowlist) return [];
    return Object.entries(allowlist).flatMap(([chainId, addresses]) =>
      addresses
        .filter((addr) => !isNativeAddress(addr.toLowerCase()))
        .map((addr) => ({
          type: NameType.EthereumAddress,
          value: addr,
          variation: chainId,
        })),
    );
  }, [isWithdraw, allowlist]);

  const apiTokenResults = useERC20Tokens(allowlistRequests);

  const filtered = useMemo(() => {
    if (!allowlist) return undefined;

    // Index wallet tokens that match the allowlist. The map doubles as a
    // deduplication set when building apiEntries below.
    const walletByKey = new Map<string, AssetType>(
      walletTokens
        .filter((token) => isAllowlisted(token, allowlist))
        .map((token) => [
          `${token.chainId?.toLowerCase()}:${(token.address ?? '').toLowerCase()}`,
          token,
        ]),
    );

    // Backfill icons for wallet tokens whose stored image is empty.
    // assets-controllers stores image:"" for many ERC20s even when the token
    // list has a valid iconUrl.
    allowlistRequests.forEach((req, idx) => {
      const key = `${(req.variation as string).toLowerCase()}:${req.value.toLowerCase()}`;
      const walletToken = walletByKey.get(key);
      const apiImage = apiTokenResults[idx]?.image;
      if (walletToken && !walletToken.image && apiImage) {
        walletByKey.set(key, {
          ...walletToken,
          image: apiImage,
          logo: apiImage,
        });
      }
    });

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

    // For each allowlisted ERC20 not already in the wallet, construct a
    // zero-balance entry from the API data.
    const apiEntries = allowlistRequests
      .map((req, idx) => {
        const key = `${(req.variation as string).toLowerCase()}:${req.value.toLowerCase()}`;
        if (walletByKey.has(key)) return undefined;
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

    return [...walletByKey.values(), ...apiEntries];
  }, [
    walletTokens,
    allowlist,
    allowlistRequests,
    apiTokenResults,
    fiatCurrency,
  ]);

  return useCallback(
    (tokens: AssetType[]): AssetType[] => {
      if (!isWithdraw || !filtered) {
        return tokens;
      }
      return filtered;
    },
    [isWithdraw, filtered],
  );
}

function isAllowlisted(
  token: AssetType,
  allowlist: Record<Hex, Hex[]>,
): boolean {
  const chainId = token.chainId?.toLowerCase() as Hex | undefined;
  if (!chainId) {
    return false;
  }

  const allowlistKey = Object.keys(allowlist).find(
    (key) => key.toLowerCase() === chainId,
  ) as Hex | undefined;
  const addresses = allowlistKey ? allowlist[allowlistKey] : undefined;
  if (!addresses) {
    return false;
  }

  const tokenAddr = token.address?.toLowerCase();
  return addresses.some((allowed) => {
    const allowedLower = allowed.toLowerCase();
    if (tokenAddr === allowedLower) {
      return true;
    }
    // Allowlist may use 0x000…000 for native tokens while the token list
    // uses the chain-specific native address (e.g. 0x…1010 on Polygon).
    if (isNativeAddress(allowedLower)) {
      const nativeAddr = getNativeTokenAddress(chainId);
      return tokenAddr === nativeAddr.toLowerCase();
    }
    return false;
  });
}
