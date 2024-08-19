/* eslint-disable react/prop-types */
import React, { useRef, useState, LegacyRef } from 'react';
import {
  TouchableOpacity,
  View,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import Modal from 'react-native-modal';
import { useSelector } from 'react-redux';
import ActionSheet from '@metamask/react-native-actionsheet';
import { strings } from '../../../../locales/i18n';
import {
  renderFromTokenMinimalUnit,
  addCurrencySymbol,
  balanceToFiatNumber,
  renderFiat,
} from '../../../util/number';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import AssetElement from '../AssetElement';
import { safeToChecksumAddress } from '../../../util/address';
import { MetaMetricsEvents } from '../../../core/Analytics';
import NetworkMainAssetLogo from '../NetworkMainAssetLogo';
import { isZero } from '../../../util/lodash';
import { useTheme } from '../../../util/theme';
import NotificationManager from '../../../core/NotificationManager';
import {
  getDecimalChainId,
  getTestNetImageByChainId,
  isLineaMainnetByChainId,
  isMainnetByChainId,
  isTestNet,
} from '../../../util/networks';
import {
  selectChainId,
  selectNetworkClientId,
  selectProviderConfig,
  selectTicker,
} from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { createDetectedTokensNavDetails } from '../../Views/DetectedTokens';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import { BadgeVariant } from '../../../component-library/components/Badges/Badge/Badge.types';

import images from 'images/image-icons';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import createStyles from './styles';
import Routes from '../../../constants/navigation/Routes';
import { TOKEN_BALANCE_LOADING, TOKEN_RATE_UNDEFINED } from './constants';
import AppConstants from '../../../core/AppConstants';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

import { BrowserTab, TokenI, TokensI } from './types';
import useRampNetwork from '../Ramp/hooks/useRampNetwork';
import { createBuyNavigationDetails } from '../Ramp/routes/utils';
import Badge from '../../../component-library/components/Badges/Badge/Badge';
import useTokenBalancesController from '../../hooks/useTokenBalancesController/useTokenBalancesController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectDetectedTokens } from '../../../selectors/tokensController';
import { selectContractExchangeRates } from '../../../selectors/tokenRatesController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import useIsOriginalNativeTokenSymbol from '../../hooks/useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../app/component-library/components/Buttons/ButtonIcon';
import Box from '../../UI/Ramp/components/Box';
import SheetHeader from '../../../../app/component-library/components/Sheet/SheetHeader';
import { isPortfolioUrl } from '../../../../app/util/url';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { zeroAddress } from 'ethereumjs-util';
import PercentageChange from '../../../component-library/components-temp/Price/PercentageChange';
import AggregatedPercentage from '../../../component-library/components-temp/Price/AggregatedPercentage';
import { RootState } from 'app/reducers';
import { Asset } from '../../hooks/useAddressBalance/useAddressBalance.types';
import { Hex } from '@metamask/utils';

// this will be imported from TokenRatesController when it is exported from there
// PR: https://github.com/MetaMask/core/pull/4622
type MarketDataDetails = {
  tokenAddress: `0x${string}`;
  value: number;
  currency: string;
  allTimeHigh: number;
  allTimeLow: number;
  circulatingSupply: number;
  dilutedMarketCap: number;
  high1d: number;
  low1d: number;
  marketCap: number;
  marketCapPercentChange1d: number;
  price: number;
  priceChange1d: number;
  pricePercentChange1d: number;
  pricePercentChange1h: number;
  pricePercentChange1y: number;
  pricePercentChange7d: number;
  pricePercentChange14d: number;
  pricePercentChange30d: number;
  pricePercentChange200d: number;
  totalVolume: number;
};

const Tokens: React.FC<TokensI> = ({ tokens }) => {
  const { colors } = useTheme();
  const { trackEvent, isEnabled } = useMetrics();
  const styles = createStyles(colors);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [tokenToRemove, setTokenToRemove] = useState<TokenI>();
  const [isAddTokenEnabled, setIsAddTokenEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showScamWarningModal, setShowScamWarningModal] = useState(false);
  const [isNetworkRampSupported, isNativeTokenRampSupported] = useRampNetwork();

  const actionSheet = useRef<typeof ActionSheet>();

  const networkName = useSelector(selectNetworkName);
  const { type, rpcUrl } = useSelector(selectProviderConfig);
  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);
  const networkClientId = useSelector(selectNetworkClientId);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const primaryCurrency = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.settings.primaryCurrency,
  );
  const { data: tokenBalances } = useTokenBalancesController();
  const tokenExchangeRates = useSelector(selectContractExchangeRates);

  const hideZeroBalanceTokens = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.settings.hideZeroBalanceTokens,
  );
  const detectedTokens = useSelector(selectDetectedTokens);
  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const browserTabs = useSelector((state: any) => state.browser.tabs);
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );

  const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
    chainId,
    ticker,
    type,
  );

  const renderEmpty = () => (
    <View style={styles.emptyView}>
      <Text style={styles.text}>{strings('wallet.no_tokens')}</Text>
    </View>
  );

  const onItemPress = (token: TokenI) => {
    navigation.navigate('Asset', {
      ...token,
    });
  };

  const goToNetworkEdit = () => {
    navigation.navigate(Routes.ADD_NETWORK, {
      network: rpcUrl,
    });

    setShowScamWarningModal(false);
  };

  const renderScamWarningIcon = (asset: Asset) => {
    if (!isOriginalNativeTokenSymbol && asset.isETH) {
      return (
        <ButtonIcon
          iconName={IconName.Danger}
          onPressIn={() => {
            setShowScamWarningModal(true);
          }}
          iconColor={IconColor.Error}
          size={ButtonIconSizes.Lg}
        />
      );
    }
    return null;
  };

  const renderScamWarningModal = () => (
    <Modal
      isVisible={showScamWarningModal}
      onBackdropPress={() => setShowScamWarningModal(false)}
      onSwipeComplete={() => setShowScamWarningModal(false)}
      swipeDirection="down"
      propagateSwipe
      avoidKeyboard
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
    >
      <Box style={styles.box}>
        <View style={styles.notch} />
        <SheetHeader title={strings('wallet.potential_scam')} />

        <Box style={styles.boxContent}>
          <Text>
            {strings('wallet.network_not_matching')}
            {` ${ticker},`}
            {strings('wallet.target_scam_network')}
          </Text>
        </Box>
        <Box style={styles.boxContent}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('networks.edit_network_details')}
            onPress={goToNetworkEdit}
            style={styles.editNetworkButton}
            size={ButtonSize.Lg}
          />
        </Box>
      </Box>
    </Modal>
  );

  const renderStakeButton = (asset: TokenI) => {
    const onStakeButtonPress = () => {
      const existingStakeTab = browserTabs.find((tab: BrowserTab) =>
        tab.url.includes(AppConstants.STAKE.URL),
      );
      let existingTabId;
      let newTabUrl;
      if (existingStakeTab) {
        existingTabId = existingStakeTab.id;
      } else {
        newTabUrl = `${AppConstants.STAKE.URL}?metamaskEntry=mobile`;
      }
      const params = {
        ...(newTabUrl && { newTabUrl }),
        ...(existingTabId && { existingTabId, newTabUrl: undefined }),
        timestamp: Date.now(),
      };
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params,
      });
      trackEvent(MetaMetricsEvents.STAKE_BUTTON_CLICKED, {
        chain_id: getDecimalChainId(chainId),
        location: 'Home Screen',
        text: 'Stake',
        token_symbol: asset.symbol,
        url: AppConstants.STAKE.URL,
      });
    };

    return (
      <Pressable
        onPress={onStakeButtonPress}
        testID={WalletViewSelectorsIDs.STAKE_BUTTON}
        style={styles.stakeButton}
      >
        <Text variant={TextVariant.BodyLGMedium}>
          {' • '}
          <Text color={TextColor.Primary} variant={TextVariant.BodyLGMedium}>
            {`${strings('stake.stake')} `}
          </Text>
        </Text>
        <Icon
          name={IconName.Plant}
          size={IconSize.Sm}
          color={IconColor.Primary}
        />
      </Pressable>
    );
  };

  const goToAddToken = () => {
    setIsAddTokenEnabled(false);
    navigation.push('AddAsset', { assetType: 'token' });

    trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CLICKED, {
      source: 'manual',
      chain_id: getDecimalChainId(chainId),
    });
    setIsAddTokenEnabled(true);
  };

  const renderFooter = () => (
    <View style={styles.footer} key={'tokens-footer'}>
      <TouchableOpacity
        style={styles.add}
        onPress={goToAddToken}
        disabled={!isAddTokenEnabled}
        testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
      >
        <Text style={styles.centered}>
          <Text style={styles.emptyText}>
            {strings('wallet.no_available_tokens')}
          </Text>{' '}
          <Text style={styles.addText}>{strings('wallet.add_tokens')}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  const showRemoveMenu = (token: TokenI) => {
    if (actionSheet.current) {
      setTokenToRemove(token);
      actionSheet.current.show();
    }
  };

  const handleBalance = (asset: TokenI) => {
    const itemAddress: string = safeToChecksumAddress(asset.address) || '';

    let tokenMarketData: MarketDataDetails | 'tokenRateUndefined' | undefined;
    if (tokenExchangeRates) {
      if (tokenExchangeRates[itemAddress as Hex]) {
        tokenMarketData =
          tokenExchangeRates[itemAddress as Hex] || TOKEN_RATE_UNDEFINED;
      }
    }

    const balance =
      asset.balance ||
      (itemAddress in tokenBalances
        ? renderFromTokenMinimalUnit(tokenBalances[itemAddress], asset.decimals)
        : '');

    if (!balance && !asset.isETH) {
      return {
        balanceFiat: TOKEN_BALANCE_LOADING,
        balanceValueFormatted: TOKEN_BALANCE_LOADING,
      };
    }

    const balanceValueFormatted = `${balance} ${asset.symbol}`;

    if (!conversionRate)
      return {
        balanceFiat: asset.isETH ? asset.balanceFiat : TOKEN_BALANCE_LOADING,
        balanceValueFormatted,
      };

    if (!tokenMarketData || tokenMarketData === TOKEN_RATE_UNDEFINED)
      return {
        balanceFiat: asset.isETH ? asset.balanceFiat : TOKEN_RATE_UNDEFINED,
        balanceValueFormatted,
      };

    const balanceFiatCalculation = Number(
      asset.balanceFiat ||
        balanceToFiatNumber(balance, conversionRate, tokenMarketData.price),
    );

    const balanceFiat =
      balanceFiatCalculation >= 0.01 || balanceFiatCalculation === 0
        ? addCurrencySymbol(balanceFiatCalculation, currentCurrency)
        : `< ${addCurrencySymbol('0.01', currentCurrency)}`;

    return { balanceFiat, balanceValueFormatted };
  };

  const renderItem = (asset: TokenI) => {
    const itemAddress = safeToChecksumAddress(asset.address);

    const { balanceFiat, balanceValueFormatted } = handleBalance(asset);

    const pricePercentChange1d = itemAddress
      ? tokenExchangeRates?.[itemAddress as `0x${string}`]?.pricePercentChange1d
      : tokenExchangeRates?.[zeroAddress() as Hex]?.pricePercentChange1d;

    // render balances according to primary currency
    let mainBalance, secondaryBalance;
    mainBalance = TOKEN_BALANCE_LOADING;

    // Set main and secondary balances based on the primary currency and asset type.
    if (primaryCurrency === 'ETH') {
      // Default to displaying the formatted balance value and its fiat equivalent.
      mainBalance = balanceValueFormatted;
      secondaryBalance = balanceFiat;

      // For ETH as a native currency, adjust display based on network safety.
      if (asset.isETH) {
        // Main balance always shows the formatted balance value for ETH.
        mainBalance = balanceValueFormatted;
        // Display fiat value as secondary balance only for original native tokens on safe networks.
        secondaryBalance = isOriginalNativeTokenSymbol ? balanceFiat : null;
      }
    } else {
      // For non-ETH currencies, determine balances based on the presence of fiat value.
      mainBalance = !balanceFiat ? balanceValueFormatted : balanceFiat;
      secondaryBalance = !balanceFiat ? balanceFiat : balanceValueFormatted;

      // Adjust balances for native currencies in non-ETH scenarios.
      if (asset.isETH) {
        // Main balance logic: Show crypto value if fiat is absent or fiat value on safe networks.
        mainBalance = !balanceFiat
          ? balanceValueFormatted // Show crypto value if fiat setting is not preferred.
          : isOriginalNativeTokenSymbol // Check for safe network to decide on fiat display.
          ? balanceFiat
          : null;
        // Secondary balance mirrors the main balance logic for consistency.
        secondaryBalance = !balanceFiat ? balanceFiat : balanceValueFormatted;
      }
    }

    if (asset?.balanceError) {
      mainBalance = asset.symbol;
      secondaryBalance = strings('wallet.unable_to_load');
    }

    if (balanceFiat === TOKEN_RATE_UNDEFINED) {
      mainBalance = balanceValueFormatted;
      secondaryBalance = strings('wallet.unable_to_find_conversion_rate');
    }

    asset = { ...asset, balanceFiat };

    const isMainnet = isMainnetByChainId(chainId);
    const isLineaMainnet = isLineaMainnetByChainId(chainId);

    const NetworkBadgeSource = () => {
      if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

      if (isMainnet) return images.ETHEREUM;

      if (isLineaMainnet) return images['LINEA-MAINNET'];

      return ticker ? images[ticker] : undefined;
    };

    return (
      <AssetElement
        key={itemAddress || '0x'}
        onPress={onItemPress}
        onLongPress={asset.isETH ? null : showRemoveMenu}
        asset={asset}
        balance={secondaryBalance}
        mainBalance={mainBalance}
      >
        <BadgeWrapper
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={NetworkBadgeSource()}
              name={networkName}
            />
          }
        >
          {asset.isETH ? (
            <NetworkMainAssetLogo style={styles.ethLogo} />
          ) : (
            <AvatarToken
              name={asset.symbol}
              imageSource={{ uri: asset.image }}
              size={AvatarSize.Md}
            />
          )}
        </BadgeWrapper>

        <View style={styles.balances}>
          {/*
           * The name of the token must callback to the symbol
           * The reason for this is that the wallet_watchAsset doesn't return the name
           * more info: https://docs.metamask.io/guide/rpc-api.html#wallet-watchasset
           */}
          <View style={styles.assetName}>
            <Text variant={TextVariant.BodyLGMedium}>
              {asset.name || asset.symbol}
            </Text>
            {/** Add button link to Portfolio Stake if token is mainnet ETH */}
            {asset.isETH && isMainnet && renderStakeButton(asset)}
          </View>
          {!isTestNet(chainId) ? (
            <PercentageChange value={pricePercentChange1d} />
          ) : null}
        </View>

        {renderScamWarningIcon(asset)}
        {renderScamWarningModal()}
      </AssetElement>
    );
  };

  const goToBuy = () => {
    navigation.navigate(...createBuyNavigationDetails());
    trackEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
      text: 'Buy Native Token',
      location: 'Home Screen',
      chain_id_destination: getDecimalChainId(chainId),
    });
  };

  const showDetectedTokens = () => {
    navigation.navigate(...createDetectedTokensNavDetails());
    trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CLICKED, {
      source: 'detected',
      chain_id: getDecimalChainId(chainId),
      tokens: detectedTokens.map(
        (token) => `${token.symbol} - ${token.address}`,
      ),
    });

    setIsAddTokenEnabled(true);
  };

  const renderTokensDetectedSection = () => {
    if (!isTokenDetectionEnabled || !detectedTokens?.length) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.tokensDetectedButton}
        onPress={showDetectedTokens}
      >
        <Text
          style={styles.tokensDetectedText}
          testID={WalletViewSelectorsIDs.WALLET_TOKEN_DETECTION_LINK_BUTTON}
        >
          {strings('wallet.tokens_detected_in_account', {
            tokenCount: detectedTokens.length,
            tokensLabel: detectedTokens.length > 1 ? 'tokens' : 'token',
          })}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBuyButton = () => {
    const mainToken = tokens.find(({ isETH }) => isETH);
    if (
      !mainToken ||
      !isZero(mainToken.balance) ||
      !(isNetworkRampSupported && isNativeTokenRampSupported)
    ) {
      return null;
    }

    return (
      <View style={styles.buy}>
        <Text variant={TextVariant.HeadingSM} style={styles.buyTitle}>
          {strings('wallet.add_to_get_started')}
        </Text>

        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          style={styles.buyButton}
          onPress={goToBuy}
          label={strings('wallet.buy_asset', { asset: mainToken.symbol })}
        />
      </View>
    );
  };

  const onRefresh = async () => {
    requestAnimationFrame(async () => {
      setRefreshing(true);

      const {
        TokenDetectionController,
        AccountTrackerController,
        CurrencyRateController,
        TokenRatesController,
      } = Engine.context;
      const actions = [
        TokenDetectionController.detectTokens(),
        AccountTrackerController.refresh(),
        CurrencyRateController.startPollingByNetworkClientId(networkClientId),
        TokenRatesController.updateExchangeRates(),
      ];
      await Promise.all(actions).catch((error) => {
        Logger.error(error, 'Error while refreshing tokens');
      });
      setRefreshing(false);
    });
  };

  const renderNetworth = () => {
    const balance = Engine.getTotalFiatAccountBalance();
    let total;
    if (isOriginalNativeTokenSymbol) {
      const tokenFiatTotal = balance?.tokenFiat ?? 0;
      const ethFiatTotal = balance?.ethFiat ?? 0;
      total = tokenFiatTotal + ethFiatTotal;
    } else {
      total = balance?.tokenFiat ?? 0;
    }

    const fiatBalance = `${renderFiat(total, currentCurrency)}`;

    const onOpenPortfolio = () => {
      const existingPortfolioTab = browserTabs.find(({ url }: BrowserTab) =>
        isPortfolioUrl(url),
      );

      let existingTabId;
      let newTabUrl;
      if (existingPortfolioTab) {
        existingTabId = existingPortfolioTab.id;
      } else {
        const analyticsEnabled = isEnabled();
        const portfolioUrl = new URL(AppConstants.PORTFOLIO.URL);

        portfolioUrl.searchParams.append('metamaskEntry', 'mobile');

        // Append user's privacy preferences for metrics + marketing on user navigation to Portfolio.
        portfolioUrl.searchParams.append(
          'metricsEnabled',
          String(analyticsEnabled),
        );
        portfolioUrl.searchParams.append(
          'marketingEnabled',
          String(!!isDataCollectionForMarketingEnabled),
        );

        newTabUrl = portfolioUrl.href;
      }
      const params = {
        ...(newTabUrl && { newTabUrl }),
        ...(existingTabId && { existingTabId, newTabUrl: undefined }),
        timestamp: Date.now(),
      };
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params,
      });
      trackEvent(MetaMetricsEvents.PORTFOLIO_LINK_CLICKED, {
        portfolioUrl: AppConstants.PORTFOLIO.URL,
      });
    };

    return (
      <View style={styles.networth}>
        <View>
          <Text
            style={styles.fiatBalance}
            testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
          >
            {fiatBalance}
          </Text>

          {!isTestNet(chainId) ? (
            <AggregatedPercentage
              ethFiat={balance?.ethFiat}
              tokenFiat={balance?.tokenFiat}
              tokenFiat1dAgo={balance?.tokenFiat1dAgo}
              ethFiat1dAgo={balance?.ethFiat1dAgo}
            />
          ) : null}
        </View>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          width={ButtonWidthTypes.Full}
          style={styles.buyButton}
          onPress={onOpenPortfolio}
          label={strings('asset_overview.portfolio_button')}
          testID={WalletViewSelectorsIDs.PORTFOLIO_BUTTON}
          endIconName={IconName.Export}
        />
      </View>
    );
  };

  const renderList = () => {
    const tokensToDisplay = hideZeroBalanceTokens
      ? tokens.filter((token) => {
          const { address, isETH } = token;
          return !isZero(tokenBalances[address]) || isETH;
        })
      : tokens;

    return (
      <FlatList
        ListHeaderComponent={renderNetworth()}
        data={tokensToDisplay}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={(_, index) => index.toString()}
        ListFooterComponent={() => (
          <>
            {renderTokensDetectedSection()}
            {renderBuyButton()}
            {renderFooter()}
          </>
        )}
        refreshControl={
          <RefreshControl
            colors={[colors.primary.default]}
            tintColor={colors.icon.default}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />
    );
  };

  const removeToken = async () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { TokensController }: any = Engine.context;
    const tokenAddress = tokenToRemove?.address;
    const symbol = tokenToRemove?.symbol;
    try {
      await TokensController.ignoreTokens([tokenAddress]);
      NotificationManager.showSimpleNotification({
        status: `simple_notification`,
        duration: 5000,
        title: strings('wallet.token_toast.token_hidden_title'),
        description: strings('wallet.token_toast.token_hidden_desc', {
          tokenSymbol: symbol,
        }),
      });
      trackEvent(MetaMetricsEvents.TOKENS_HIDDEN, {
        location: 'assets_list',
        token_standard: 'ERC20',
        asset_type: 'token',
        tokens: [`${symbol} - ${tokenAddress}`],
        chain_id: getDecimalChainId(chainId),
      });
    } catch (err) {
      Logger.log(err, 'Wallet: Failed to hide token!');
    }
  };

  const onActionSheetPress = (index: number) =>
    index === 0 ? removeToken() : null;

  return (
    <View
      style={styles.wrapper}
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER}
    >
      {tokens?.length ? renderList() : renderEmpty()}
      <ActionSheet
        ref={actionSheet as LegacyRef<typeof ActionSheet>}
        title={strings('wallet.remove_token_title')}
        options={[strings('wallet.remove'), strings('wallet.cancel')]}
        cancelButtonIndex={1}
        destructiveButtonIndex={0}
        onPress={onActionSheetPress}
      />
    </View>
  );
};

export default Tokens;
