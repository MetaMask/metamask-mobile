import React, { useCallback, useMemo } from 'react';
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
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import NetworkAssetLogo from '../../NetworkAssetLogo';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../component-library/components/Texts/SensitiveText';
import { TokenI } from '../../Tokens/types';
import { useNavigation } from '@react-navigation/native';
import {
  PopularList,
  UnpopularNetworkList,
  CustomNetworkImgMapping,
  getNonEvmNetworkImageSourceByChainId,
} from '../../../../util/networks/customNetworks';
import { RootState } from '../../../../reducers';
import EarnBalance from '../../Earn/components/EarnBalance';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { selectPricePercentChange1d } from '../../../../selectors/tokenRatesController';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import Tag from '../../../../component-library/components/Tags/Tag';
import { ACCOUNT_TYPE_LABELS } from '../../../../constants/account-type-labels';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../Bridge/types';
import StockBadge from '../../shared/StockBadge';

export const ACCOUNT_TYPE_LABEL_TEST_ID = 'account-type-label';

interface BalanceProps {
  asset: TokenI;
  mainBalance: string;
  secondaryBalance?: string;
  hideTitleHeading?: boolean;
  hidePercentageChange?: boolean;
}

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

const Balance = ({
  asset,
  mainBalance,
  secondaryBalance,
  hideTitleHeading,
  hidePercentageChange,
}: BalanceProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
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
  const getPricePercentChange1d = () => {
    // First check if asset has pricePercentChange1d from navigation params (e.g., from trending view)
    if (
      asset?.pricePercentChange1d !== undefined &&
      asset?.pricePercentChange1d !== null
    ) {
      return asset.pricePercentChange1d;
    }
    if (isEvmNetworkSelected) {
      return evmPricePercentChange1d;
    }
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    return allMultichainAssetsRates[asset?.address as CaipAssetType]?.marketData
      ?.pricePercentChange?.P1D;
    ///: END:ONLY_INCLUDE_IF(keyring-snaps)
  };

  // Calculate percentage change and color for secondary balance
  const pricePercentChange1d = getPricePercentChange1d();
  const hasPercentageChange =
    !isTestNet(asset.chainId as Hex) &&
    pricePercentChange1d !== null &&
    pricePercentChange1d !== undefined &&
    Number.isFinite(pricePercentChange1d);

  // Determine the color for percentage change
  let percentageColor = TextColor.Alternative;
  if (hasPercentageChange) {
    if (pricePercentChange1d === 0) {
      percentageColor = TextColor.Alternative;
    } else if (pricePercentChange1d > 0) {
      percentageColor = TextColor.Success;
    } else {
      percentageColor = TextColor.Error;
    }
  }

  // Create percentage text for secondary balance
  const percentageText = hasPercentageChange
    ? `${pricePercentChange1d >= 0 ? '+' : ''}${pricePercentChange1d.toFixed(
        2,
      )}%`
    : undefined;

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

    return (
      <AvatarToken
        name={asset.symbol}
        imageSource={{ uri: asset.image }}
        size={AvatarSize.Lg}
      />
    );
  }, [asset, styles.ethLogo]);

  const isDisabled = useMemo(
    () => asset.isNative || isCaipChainId(asset.chainId as CaipAssetId),
    [asset.chainId, asset.isNative],
  );

  const handlePress = useCallback(
    () =>
      !asset.isNative &&
      navigation.navigate('AssetDetails', {
        chainId: asset.chainId,
        address: asset.address,
        asset,
      }),
    [asset, navigation],
  );

  const label = asset.accountType
    ? ACCOUNT_TYPE_LABELS[asset.accountType]
    : undefined;

  return (
    <View style={styles.wrapper}>
      {!hideTitleHeading && (
        <Text variant={TextVariant.HeadingMD}>
          {strings('asset_overview.your_balance')}
        </Text>
      )}
      <AssetElement
        disabled={isDisabled}
        asset={asset}
        balance={mainBalance}
        secondaryBalance={hidePercentageChange ? undefined : percentageText}
        secondaryBalanceColor={
          hidePercentageChange ? undefined : percentageColor
        }
        privacyMode={privacyMode}
        hideSecondaryBalanceInPrivacyMode={false}
        onPress={handlePress}
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
            {label && <Tag label={label} testID={ACCOUNT_TYPE_LABEL_TEST_ID} />}
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
      <EarnBalance asset={asset} />
    </View>
  );
};

export default Balance;
