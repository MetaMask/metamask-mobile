import React, {
  type ReactNode,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { View } from 'react-native';
import {
  CaipAssetId,
  CaipAssetType,
  Hex,
  isCaipChainId,
} from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './Balance.styles';
import AssetElement from '../../AssetElement';
import { TOKEN_AMOUNT_BALANCE_TEST_ID } from '../../AssetElement/index.constants';
import { useSelector } from 'react-redux';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import {
  getTestNetImageByChainId,
  getDefaultNetworkByChainId,
  isTestNet,
} from '../../../../util/networks';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import { BadgeVariant } from '../../../../component-library/components/Badges/Badge/Badge.types';
import Badge from '../../../../component-library/components/Badges/Badge/Badge';
import NetworkAssetLogo from '../../NetworkAssetLogo';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../component-library/components/Texts/SensitiveText';
import { TokenI } from '../../Tokens/types';
import {
  PopularList,
  UnpopularNetworkList,
  CustomNetworkImgMapping,
  getNonEvmNetworkImageSourceByChainId,
} from '../../../../util/networks/customNetworks';
import { RootState } from '../../../../reducers';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { selectPricePercentChange1d } from '../../../../selectors/tokenRatesController';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../Bridge/types';
import StockBadge from '../../shared/StockBadge';
import AssetLogo from '../../Assets/components/AssetLogo/AssetLogo';
import {
  emptyRestingHeaderStore,
  formatBalanceAtPrice,
  formatSignedPercent,
  type RestingHeaderStore,
} from '../Price/restingHeader';

interface BalanceProps {
  asset: TokenI;
  balanceCta?: ReactNode;
  balanceDescription?: ReactNode;
  mainBalance: string;
  secondaryBalance?: string;
  priceChangeOverride?: string;
  priceChangeOverrideColor?: TextColor;
  hideTitleHeading?: boolean;
  hidePercentageChange?: boolean;
  /** Unformatted token amount. With a resting header price, reprices `mainBalance`. */
  balanceAmount?: number;
  /** Display currency for the repriced fiat amount. */
  fiatCurrency?: string;
  /** Chart header price while the chart is not being scrubbed. */
  restingHeaderStore?: RestingHeaderStore;
}

const percentColor = (percent: number): TextColor => {
  if (percent > 0) {
    return TextColor.Success;
  }
  if (percent < 0) {
    return TextColor.Error;
  }
  return TextColor.Alternative;
};

export const NetworkBadgeSource = (chainId: Hex) => {
  if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);
  const defaultNetwork = getDefaultNetworkByChainId(chainId) as
    | {
        imageSource: string;
      }
    | undefined;

  if (defaultNetwork) {
    return defaultNetwork.imageSource;
  }

  const unpopularNetwork = UnpopularNetworkList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const customNetworkImg = CustomNetworkImgMapping[chainId];

  const popularNetwork = PopularList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const network = unpopularNetwork || popularNetwork;
  if (network) {
    return network.rpcPrefs.imageSource;
  }

  if (isCaipChainId(chainId)) {
    return getNonEvmNetworkImageSourceByChainId(chainId);
  }

  if (customNetworkImg) {
    return customNetworkImg;
  }
};

/**
 * The asset's 1d change. A navigation param wins (e.g. the trending view),
 * then the EVM token rates, then the multichain rates.
 */
const resolvePricePercentChange1d = ({
  asset,
  isEvmNetworkSelected,
  evmPricePercentChange1d,
  multichainAssetsRates,
}: {
  asset: TokenI;
  isEvmNetworkSelected: boolean;
  evmPricePercentChange1d: number | undefined;
  multichainAssetsRates: ReturnType<typeof selectMultichainAssetsRates>;
}) => {
  if (
    asset.pricePercentChange1d !== undefined &&
    asset.pricePercentChange1d !== null
  ) {
    return asset.pricePercentChange1d;
  }
  if (isEvmNetworkSelected) {
    return evmPricePercentChange1d;
  }
  return multichainAssetsRates[asset.address as CaipAssetType]?.marketData
    ?.pricePercentChange?.P1D;
};

/**
 * The secondary line under the main balance. Hidden, then the chart's override,
 * then the live resting change, then the polled change.
 */
const resolveSecondaryBalance = ({
  hidePercentageChange,
  priceChangeOverride,
  livePercent,
  percentageText,
}: {
  hidePercentageChange?: boolean;
  priceChangeOverride?: string;
  livePercent?: number;
  percentageText?: string;
}): string | undefined => {
  if (hidePercentageChange) {
    return undefined;
  }
  if (priceChangeOverride !== undefined) {
    return priceChangeOverride;
  }
  if (livePercent === undefined) {
    return percentageText;
  }
  return formatSignedPercent(livePercent);
};

/** Colour of the secondary line. Same precedence as `resolveSecondaryBalance`. */
const resolveSecondaryBalanceColor = ({
  hidePercentageChange,
  priceChangeOverride,
  priceChangeOverrideColor,
  livePercent,
  percentageColor,
}: {
  hidePercentageChange?: boolean;
  priceChangeOverride?: string;
  priceChangeOverrideColor?: TextColor;
  livePercent?: number;
  percentageColor: TextColor;
}): TextColor | undefined => {
  if (hidePercentageChange) {
    return undefined;
  }
  if (priceChangeOverride) {
    return priceChangeOverrideColor;
  }
  if (livePercent === undefined) {
    return percentageColor;
  }
  return percentColor(livePercent);
};

const Balance = ({
  asset,
  balanceCta,
  balanceDescription,
  mainBalance,
  secondaryBalance,
  priceChangeOverride,
  priceChangeOverrideColor,
  hideTitleHeading,
  hidePercentageChange,
  balanceAmount,
  fiatCurrency,
  restingHeaderStore,
}: BalanceProps) => {
  const { styles } = useStyles(styleSheet, {});
  const headerStore = restingHeaderStore ?? emptyRestingHeaderStore;
  const restingHeader = useSyncExternalStore(
    headerStore.subscribe,
    headerStore.getSnapshot,
    headerStore.getSnapshot,
  );
  const liveFiat = formatBalanceAtPrice(
    balanceAmount,
    restingHeader?.price,
    fiatCurrency,
  );
  const shownMainBalance = liveFiat ?? mainBalance;
  const livePercent =
    restingHeader?.percent !== undefined &&
    Number.isFinite(restingHeader.percent)
      ? restingHeader.percent
      : undefined;
  const { isStockToken } = useRWAToken();
  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const isEvmNetworkSelected = !isNonEvmChainId(asset.chainId as string);
  const privacyMode = useSelector(selectPrivacyMode);
  const evmPricePercentChange1d = useSelector((state: RootState) =>
    selectPricePercentChange1d(
      state,
      asset.chainId as Hex,
      asset?.isNative
        ? getNativeTokenAddress(asset.chainId as Hex)
        : (asset?.address as Hex),
    ),
  );
  const allMultichainAssetsRates = useSelector(selectMultichainAssetsRates);

  const pricePercentChange1d = resolvePricePercentChange1d({
    asset,
    isEvmNetworkSelected,
    evmPricePercentChange1d,
    multichainAssetsRates: allMultichainAssetsRates,
  });
  const hasPercentageChange =
    !isTestNet(asset.chainId as Hex) &&
    pricePercentChange1d !== null &&
    pricePercentChange1d !== undefined &&
    Number.isFinite(pricePercentChange1d);

  // Create percentage text for secondary balance
  const percentageText = hasPercentageChange
    ? `${pricePercentChange1d >= 0 ? '+' : ''}${pricePercentChange1d.toFixed(
        2,
      )}%`
    : undefined;

  const resolvedSecondaryBalance = resolveSecondaryBalance({
    hidePercentageChange,
    priceChangeOverride,
    livePercent,
    percentageText,
  });
  const resolvedSecondaryBalanceColor = resolveSecondaryBalanceColor({
    hidePercentageChange,
    priceChangeOverride,
    priceChangeOverrideColor,
    livePercent,
    percentageColor: hasPercentageChange
      ? percentColor(pricePercentChange1d)
      : TextColor.Alternative,
  });

  const tokenChainId = asset.chainId;

  const renderNetworkAvatar = useCallback(() => {
    if (asset.isNative) {
      return (
        <NetworkAssetLogo
          chainId={asset.chainId as Hex}
          style={styles.ethLogo}
          ticker={asset.ticker ?? asset.symbol}
          big={false}
          biggest={false}
          testID={asset.name}
        />
      );
    }

    return <AssetLogo asset={asset} />;
  }, [asset, styles.ethLogo]);

  const isDisabled = useMemo(
    () => asset.isNative || isCaipChainId(asset.chainId as CaipAssetId),
    [asset.chainId, asset.isNative],
  );

  return (
    <View style={styles.wrapper}>
      {!hideTitleHeading && (
        <Text variant={TextVariant.HeadingMD}>
          {strings('asset_overview.your_balance')}
        </Text>
      )}
      {balanceDescription}
      <AssetElement
        disabled={isDisabled}
        asset={asset}
        balance={shownMainBalance}
        secondaryBalance={resolvedSecondaryBalance}
        secondaryBalanceColor={resolvedSecondaryBalanceColor}
        privacyMode={privacyMode}
        hideSecondaryBalanceInPrivacyMode={false}
      >
        <BadgeWrapper
          style={styles.badgeWrapper}
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={NetworkBadgeSource(tokenChainId as Hex)}
              name={networkConfigurationByChainId?.name}
            />
          }
        >
          {renderNetworkAvatar()}
        </BadgeWrapper>

        <View style={styles.percentageChange}>
          <View style={styles.assetName}>
            <Text variant={TextVariant.BodyMD}>
              {asset.name || asset.symbol}
            </Text>
          </View>

          <View style={styles.balanceRow}>
            {secondaryBalance && (
              <SensitiveText
                variant={TextVariant.BodySMMedium}
                style={styles.tokenAmount}
                isHidden={privacyMode}
                length={SensitiveTextLength.Short}
                testID={TOKEN_AMOUNT_BALANCE_TEST_ID}
              >
                {secondaryBalance}
              </SensitiveText>
            )}
            {isStockToken(asset as BridgeToken) && (
              <StockBadge token={asset as BridgeToken} />
            )}
          </View>
        </View>
      </AssetElement>
      {balanceCta}
    </View>
  );
};

export default Balance;
