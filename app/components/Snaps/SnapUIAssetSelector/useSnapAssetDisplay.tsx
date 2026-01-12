import { useMemo } from 'react';
import {
  CaipAccountId,
  CaipAssetType,
  CaipChainId,
  KnownCaipNamespace,
  parseCaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';
import { useSelector } from 'react-redux';
import { getMemoizedInternalAccountByAddress } from '../../../selectors/accountsController';
import { selectMultichainTokenListForAccountId } from '../../../selectors/multichain';
import I18n from '../../../../locales/i18n';
import { formatWithThreshold } from '../../../util/assets';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../constants/bridge';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { RootState } from '../../../reducers';
import { getNonEvmNetworkImageSourceByChainId } from '../../../util/networks/customNetworks';
import { AllowedBridgeChainIds } from '@metamask/bridge-controller';

/**
 * An asset for the SnapUIAssetSelector.
 */
export interface SnapUIAsset {
  icon: string;
  symbol: string;
  name: string;
  balance: string;
  fiat: string;
  chainId: CaipChainId;
  address: CaipAssetType;
  networkName: string;
  networkIcon?: string;
}

interface TokenWithFiatAmount {
  image: string;
  symbol: string;
  name: string;
  balance: string;
  secondary: string;
  chainId: CaipChainId;
  address: CaipAssetType;
}

/**
 * The parameters for the hook.
 *
 * @param addresses - The addresses to get the assets for.
 * This is a list of the same address but for different chains.
 * @param chainIds - The chainIds to filter the assets by.
 */
interface UseSnapAssetSelectorDataParams {
  addresses: CaipAccountId[];
  chainIds?: CaipChainId[];
}

/**
 * Gets the assets from state and format them for the SnapUIAssetSelector.
 *
 * @param params - The parameters for the hook.
 * @param params.addresses - The addresses to get the assets for.
 * This is a list of the same address but for different chains.
 * @param params.chainIds - The chainIds to filter the assets by.
 * @returns The formatted assets.
 */
export const useSnapAssetSelectorData = ({
  addresses,
  chainIds,
}: UseSnapAssetSelectorDataParams) => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const locale = I18n.locale;

  const parsedAccounts = addresses.map(parseCaipAccountId);

  const account = useSelector((state) =>
    getMemoizedInternalAccountByAddress(state, parsedAccounts[0].address),
  );
  const networks = useSelector(selectNetworkConfigurations);

  const assets = useSelector((state: RootState) =>
    selectMultichainTokenListForAccountId(state, account?.id),
  ) as TokenWithFiatAmount[];

  /**
   * Formats a fiat balance.
   *
   * @param balance - The balance to format.
   * @returns The formatted balance.
   */
  const formatFiatBalance = (balance: number | null = 0) =>
    formatWithThreshold(balance, 0.01, locale, {
      style: 'currency',
      currency: currentCurrency.toUpperCase(),
    });

  /**
   * Formats an asset balance.
   *
   * @param balance - The balance to format.
   * @returns The formatted balance.
   */
  const formatAssetBalance = (balance: string) => {
    const parsedBalance = parseFloat(balance);
    return formatWithThreshold(parsedBalance, 0.00001, locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 5,
    });
  };

  /**
   * Formats a non-EVM asset for the SnapUIAssetSelector.
   *
   * @param asset - The asset to format.
   * @returns The formatted asset.
   */
  const formatAsset = (asset: TokenWithFiatAmount) => {
    const networkName =
      NETWORK_TO_SHORT_NETWORK_NAME_MAP[
        asset.chainId as AllowedBridgeChainIds
      ] ?? networks[asset.chainId]?.name;

    return {
      icon: asset.image,
      symbol: asset.symbol,
      name: asset.name,
      balance: formatAssetBalance(asset.balance),
      networkName,
      networkIcon: getNonEvmNetworkImageSourceByChainId(
        asset.chainId as CaipChainId,
      ),
      fiat: formatFiatBalance(Number(asset.secondary)),
      chainId: asset.chainId as CaipChainId,
      address: asset.address as CaipAssetType,
    };
  };

  // Filter the chain IDs to only include the requested ones.
  const requestedChainIds = parsedAccounts
    .map((chainId) => chainId)
    .filter(({ chainId }) => (chainIds ? chainIds?.includes(chainId) : true));

  const formattedAssets = useMemo(() => {
    // Filter the assets by the requested chain IDs
    const filteredAssets = assets.filter((asset) =>
      requestedChainIds.some(({ chainId, chain: { namespace, reference } }) => {
        // Handles the "eip155:0" case
        if (namespace === KnownCaipNamespace.Eip155 && reference === '0') {
          const { namespace: assetNamepace } = parseCaipChainId(asset.chainId);
          return assetNamepace === namespace;
        }

        return chainId === asset.chainId;
      }),
    );

    // Format the assets
    const formatted: SnapUIAsset[] = filteredAssets.map(formatAsset);

    return formatted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  return formattedAssets;
};
