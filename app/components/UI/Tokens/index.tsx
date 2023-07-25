/* eslint-disable react/prop-types */
import React, { useRef, useState } from 'react';
import {
  TouchableOpacity,
  View,
  InteractionManager,
  Platform,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import ActionSheet from 'react-native-actionsheet';
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
import Analytics from '../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import NetworkMainAssetLogo from '../NetworkMainAssetLogo';
import { isZero } from '../../../util/lodash';
import { useTheme } from '../../../util/theme';
import NotificationManager from '../../../core/NotificationManager';
import {
  getDecimalChainId,
  getNetworkNameFromProvider,
  getTestNetImageByChainId,
  isLineaMainnetByChainId,
  isMainnetByChainId,
  isTestNet,
} from '../../../util/networks';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  IMPORT_TOKEN_BUTTON_ID,
  MAIN_WALLET_VIEW_VIA_TOKENS_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import {
  selectChainId,
  selectProviderConfig,
  selectTicker,
} from '../../../selectors/networkController';
import { createDetectedTokensNavDetails } from '../../Views/DetectedTokens';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import { BadgeVariant } from '../../../component-library/components/Badges/Badge/Badge.types';

import images from 'images/image-icons';
import {
  AvatarSize,
  AvatarVariants,
} from '../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import { EngineState } from '../../../selectors/types';
import { StackNavigationProp } from '@react-navigation/stack';
import createStyles from './styles';
import SkeletonText from '../Ramp/components/SkeletonText';
import Routes from '../../../constants/navigation/Routes';
import { TOKEN_BALANCE_LOADING, TOKEN_RATE_UNDEFINED } from './constants';
import AppConstants from '../../../core/AppConstants';
import { IconName } from '../../../component-library/components/Icons/Icon';

import {
  PORTFOLIO_BUTTON,
  TOTAL_BALANCE_TEXT,
} from '../../../../wdio/screen-objects/testIDs/Components/Tokens.testIds';

import { BrowserTab, TokenI, TokensI } from './types';
import useOnRampNetwork from '../Ramp/hooks/useOnRampNetwork';
import Badge from '../../../component-library/components/Badges/Badge/Badge';
import useTokenBalancesController from '../../hooks/useTokenBalancesController/useTokenBalancesController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectDetectedTokens } from '../../../selectors/tokensController';
import { selectContractExchangeRates } from '../../../selectors/tokenRatesController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';

const Tokens: React.FC<TokensI> = ({ tokens }) => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [tokenToRemove, setTokenToRemove] = useState<TokenI>();
  const [isAddTokenEnabled, setIsAddTokenEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isNetworkBuySupported, isNativeTokenBuySupported] = useOnRampNetwork();

  const actionSheet = useRef<ActionSheet>();

  const networkName = useSelector((state: EngineState) => {
    const providerConfig = selectProviderConfig(state);
    return getNetworkNameFromProvider(providerConfig);
  });
  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const primaryCurrency = useSelector(
    (state: any) => state.settings.primaryCurrency,
  );
  const { data: tokenBalances } = useTokenBalancesController();
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const hideZeroBalanceTokens = useSelector(
    (state: any) => state.settings.hideZeroBalanceTokens,
  );
  const detectedTokens = useSelector(selectDetectedTokens);
  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  const browserTabs = useSelector((state: any) => state.browser.tabs);

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

  const goToAddToken = () => {
    setIsAddTokenEnabled(false);
    navigation.push('AddAsset', { assetType: 'token' });
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CLICKED, {
        source: 'manual',
        chain_id: getDecimalChainId(chainId),
      });
      setIsAddTokenEnabled(true);
    });
  };

  const renderFooter = () => (
    <View style={styles.footer} key={'tokens-footer'}>
      <TouchableOpacity
        style={styles.add}
        onPress={goToAddToken}
        disabled={!isAddTokenEnabled}
        {...generateTestId(Platform, IMPORT_TOKEN_BUTTON_ID)}
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

    // When the exchange rate of a token is not found, the return is undefined
    // We fallback to the TOKEN_RATE_UNDEFINED to handle it properly
    const exchangeRate =
      itemAddress in tokenExchangeRates
        ? tokenExchangeRates[itemAddress] || TOKEN_RATE_UNDEFINED
        : undefined;

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

    if (!conversionRate || !exchangeRate)
      return {
        balanceFiat: asset.isETH ? asset.balanceFiat : TOKEN_BALANCE_LOADING,
        balanceValueFormatted,
      };

    if (exchangeRate === TOKEN_RATE_UNDEFINED)
      return {
        balanceFiat: asset.isETH ? asset.balanceFiat : TOKEN_RATE_UNDEFINED,
        balanceValueFormatted,
      };

    const balanceFiatCalculation =
      asset.balanceFiat ||
      balanceToFiatNumber(balance, conversionRate, exchangeRate);

    const balanceFiat =
      balanceFiatCalculation >= 0.01 || balanceFiatCalculation === 0
        ? addCurrencySymbol(balanceFiatCalculation, currentCurrency)
        : `< ${addCurrencySymbol('0.01', currentCurrency)}`;

    return { balanceFiat, balanceValueFormatted };
  };

  const renderItem = (asset: TokenI) => {
    const itemAddress = safeToChecksumAddress(asset.address);

    const { balanceFiat, balanceValueFormatted } = handleBalance(asset);

    // render balances according to primary currency
    let mainBalance, secondaryBalance;
    if (primaryCurrency === 'ETH') {
      mainBalance = balanceValueFormatted;
      secondaryBalance = balanceFiat;
    } else {
      mainBalance = !balanceFiat ? balanceValueFormatted : balanceFiat;
      secondaryBalance = !balanceFiat ? balanceFiat : balanceValueFormatted;
    }

    if (asset?.balanceError) {
      mainBalance = asset.symbol;
      secondaryBalance = strings('wallet.unable_to_load');
    }

    if (balanceFiat === TOKEN_RATE_UNDEFINED) {
      mainBalance = balanceValueFormatted;
      secondaryBalance = strings('wallet.unable_to_load');
    }

    asset = { ...asset, balanceFiat };

    const isMainnet = isMainnetByChainId(chainId);
    const isLineaMainnet = isLineaMainnetByChainId(chainId);

    const NetworkBadgeSource = () => {
      if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

      if (isMainnet) return images.ETHEREUM;

      if (isLineaMainnet) return images['LINEA-MAINNET'];

      return images[ticker];
    };

    return (
      <AssetElement
        key={itemAddress || '0x'}
        onPress={onItemPress}
        onLongPress={asset.isETH ? null : showRemoveMenu}
        asset={asset}
        balance={secondaryBalance}
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
              variant={AvatarVariants.Token}
              name={asset.symbol}
              imageSource={{ uri: asset.image }}
              size={AvatarSize.Md}
            />
          )}
        </BadgeWrapper>

        <View style={styles.balances} testID={'balance'}>
          {/*
           * The name of the token must callback to the symbol
           * The reason for this is that the wallet_watchAsset doesn't return the name
           * more info: https://docs.metamask.io/guide/rpc-api.html#wallet-watchasset
           */}
          <Text variant={TextVariant.BodyLGMedium}>
            {asset.name || asset.symbol}
          </Text>

          <Text variant={TextVariant.BodyMD} style={styles.balanceFiat}>
            {mainBalance === TOKEN_BALANCE_LOADING ? (
              <SkeletonText thin style={styles.skeleton} />
            ) : (
              mainBalance
            )}
          </Text>
        </View>
      </AssetElement>
    );
  };

  const goToBuy = () => {
    navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEventWithParameters(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
        text: 'Buy Native Token',
        location: 'Home Screen',
        chain_id_destination: chainId,
      });
    });
  };

  const showDetectedTokens = () => {
    navigation.navigate(...createDetectedTokensNavDetails());
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CLICKED, {
        source: 'detected',
        chain_id: getDecimalChainId(chainId),
        tokens: detectedTokens.map(
          (token) => `${token.symbol} - ${token.address}`,
        ),
      });

      setIsAddTokenEnabled(true);
    });
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
        <Text style={styles.tokensDetectedText}>
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
      !(isNetworkBuySupported && isNativeTokenBuySupported)
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
        CurrencyRateController.start(),
        TokenRatesController.poll(),
      ];
      await Promise.all(actions);
      setRefreshing(false);
    });
  };

  const renderNetworth = () => {
    const fiatBalance = `${renderFiat(
      Engine.getTotalFiatAccountBalance(),
      currentCurrency,
    )}`;

    const onOpenPortfolio = () => {
      const existingPortfolioTab = browserTabs.find((tab: BrowserTab) =>
        tab.url.match(new RegExp(`${AppConstants.PORTFOLIO_URL}/(?![a-z])`)),
      );
      let existingTabId;
      let newTabUrl;
      if (existingPortfolioTab) {
        existingTabId = existingPortfolioTab.id;
      } else {
        newTabUrl = `${AppConstants.PORTFOLIO_URL}/?metamaskEntry=mobile`;
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
      Analytics.trackEvent(MetaMetricsEvents.PORTFOLIO_LINK_CLICKED, {
        portfolioUrl: AppConstants.PORTFOLIO_URL,
      });
    };

    return (
      <View style={styles.networth}>
        <Text
          style={styles.fiatBalance}
          {...generateTestId(Platform, TOTAL_BALANCE_TEXT)}
        >
          {fiatBalance}
        </Text>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          width={ButtonWidthTypes.Full}
          style={styles.buyButton}
          onPress={onOpenPortfolio}
          label={strings('asset_overview.portfolio_button')}
          {...generateTestId(Platform, PORTFOLIO_BUTTON)}
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
      InteractionManager.runAfterInteractions(() =>
        AnalyticsV2.trackEvent(MetaMetricsEvents.TOKENS_HIDDEN, {
          location: 'assets_list',
          token_standard: 'ERC20',
          asset_type: 'token',
          tokens: [`${symbol} - ${tokenAddress}`],
          chain_id: getDecimalChainId(chainId),
        }),
      );
    } catch (err) {
      Logger.log(err, 'Wallet: Failed to hide token!');
    }
  };

  const onActionSheetPress = (index: number) =>
    index === 0 ? removeToken() : null;

  return (
    <View
      style={styles.wrapper}
      {...generateTestId(Platform, MAIN_WALLET_VIEW_VIA_TOKENS_ID)}
    >
      {tokens?.length ? renderList() : renderEmpty()}
      <ActionSheet
        ref={actionSheet}
        title={strings('wallet.remove_token_title')}
        options={[strings('wallet.remove'), strings('wallet.cancel')]}
        cancelButtonIndex={1}
        destructiveButtonIndex={0}
        onPress={onActionSheetPress}
        theme={themeAppearance}
      />
    </View>
  );
};

export default Tokens;
