/* eslint-disable react/prop-types */
import React, { useCallback, useRef, useState } from 'react';
import {
  TouchableOpacity,
  View,
  InteractionManager,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import ActionSheet from 'react-native-actionsheet';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  renderFromTokenMinimalUnit,
  balanceToFiat,
  addCurrencySymbol,
} from '../../../util/number';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import AssetElement from '../AssetElement';
import { safeToChecksumAddress } from '../../../util/address';
import { trackEvent } from '../../../util/analyticsV2';
import NetworkMainAssetLogo from '../NetworkMainAssetLogo';
import { getTokenList } from '../../../reducers/tokens';
import { isZero } from '../../../util/lodash';
import { useTheme } from '../../../util/theme';
import NotificationManager from '../../../core/NotificationManager';
import { getDecimalChainId, isMainnetByChainId } from '../../../util/networks';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  IMPORT_TOKEN_BUTTON_ID,
  MAIN_WALLET_VIEW_VIA_TOKENS_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import {
  selectChainId,
  selectProviderType,
  selectTicker,
} from '../../../selectors/networkController';
import { createDetectedTokensNavDetails } from '../../Views/DetectedTokens';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import { BadgeVariants } from '../../../component-library/components/Badges/Badge/Badge.types';
import images from 'images/image-icons';
import {
  AvatarSize,
  AvatarVariants,
} from '../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useNavigation } from '@react-navigation/native';
import { EngineState } from '../../../selectors/types';
import { StackNavigationProp } from '@react-navigation/stack';
import createStyles from './styles';

interface TokensI {
  /**
   * Array of assets (in this case ERC20 tokens)
   */
  tokens: any[];
}

interface TokenI {
  address: string;
  aggregators: string[];
  balanceError: string | null;
  decimals: number;
  image: string;
  name: string;
  symbol: string;
  balance: string;
  balanceFiat: string;
  logo: string | undefined;
  isETH: boolean | undefined;
}

const Tokens: React.FC<TokensI> = ({ tokens }) => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [tokenToRemove, setTokenToRemove] = useState<{
    symbol: string;
    ticker: string;
    chainId: string;
    address: string;
  }>();
  const [isAddTokenEnabled, setIsAddTokenEnabled] = useState(true);

  const actionSheet = useRef<ActionSheet>();

  const providerType = useSelector(selectProviderType);
  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);
  const currentCurrency = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState.CurrencyRateController.currentCurrency,
  );
  const conversionRate = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState.CurrencyRateController.conversionRate,
  );
  const primaryCurrency = useSelector(
    (state: any) => state.settings.primaryCurrency,
  );
  const tokenBalances = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState.TokenBalancesController.contractBalances,
  );
  const tokenExchangeRates = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState.TokenRatesController.contractExchangeRates,
  );
  const hideZeroBalanceTokens = useSelector(
    (state: any) => state.settings.hideZeroBalanceTokens,
  );
  const tokenList = useSelector(getTokenList);
  const detectedTokens = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState.TokensController.detectedTokens,
  );
  const isTokenDetectionEnabled = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState.PreferencesController.useTokenDetection,
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

  const goToAddToken = () => {
    setIsAddTokenEnabled(false);
    navigation.push('AddAsset', { assetType: 'token' });
    InteractionManager.runAfterInteractions(() => {
      trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CLICKED, {
        source: 'manual',
        chain_id: getDecimalChainId(chainId),
      });
      setIsAddTokenEnabled(true);
    });
  };

  const renderFooter = () => (
    <View style={styles.footer} key={'tokens-footer'}>
      <Text style={styles.emptyText}>
        {strings('wallet.no_available_tokens')}
      </Text>
      <TouchableOpacity
        style={styles.add}
        onPress={goToAddToken}
        disabled={!isAddTokenEnabled}
        {...generateTestId(Platform, IMPORT_TOKEN_BUTTON_ID)}
      >
        <Text style={styles.addText}>{strings('wallet.add_tokens')}</Text>
      </TouchableOpacity>
    </View>
  );

  const showRemoveMenu = (token: any) => {
    if (actionSheet.current) {
      setTokenToRemove(token);
      actionSheet.current.show();
    }
  };

  const handleBalance = useCallback(
    (asset: TokenI) => {
      const itemAddress: any = safeToChecksumAddress(asset.address);

      const exchangeRate =
        itemAddress in tokenExchangeRates
          ? tokenExchangeRates[itemAddress]
          : undefined;

      const balance =
        asset.balance ||
        (itemAddress in tokenBalances
          ? renderFromTokenMinimalUnit(
              tokenBalances[itemAddress],
              asset.decimals,
            )
          : '');

      const balanceValueFormatted = !balance
        ? ' '
        : `${balance} ${asset.symbol}`;

      if (!conversionRate || !exchangeRate)
        return {
          balance,
          balanceFiat: asset.balanceFiat,
          balanceValueFormatted,
        };

      const balanceFiatCalculation =
        asset.balanceFiat ||
        balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency);

      const zeroBalance = addCurrencySymbol('0', currentCurrency);

      const balanceFiat = !balanceFiatCalculation?.includes(zeroBalance)
        ? balanceFiatCalculation
        : ' ';

      return { balanceFiat, balanceValueFormatted, balance };
    },
    [currentCurrency, tokenBalances, tokenExchangeRates, conversionRate],
  );

  const renderItem = (asset: TokenI) => {
    const itemAddress = safeToChecksumAddress(asset.address);
    const logo =
      itemAddress && tokenList?.[itemAddress.toLowerCase?.()]?.iconUrl;

    const { balanceFiat, balanceValueFormatted, balance } =
      handleBalance(asset);

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

    asset = { ...asset, logo, balance, balanceFiat };

    const isMainnet = isMainnetByChainId(chainId);

    const NetworkBadgeSource = isMainnet ? images.ETHEREUM : images[ticker];

    const badgeName = (isMainnet ? providerType : ticker) || '';

    return (
      <AssetElement
        key={itemAddress || '0x'}
        testID={'asset'}
        onPress={onItemPress}
        onLongPress={asset.isETH ? null : showRemoveMenu}
        asset={asset}
        balance={secondaryBalance}
      >
        <BadgeWrapper
          badgeProps={{
            variant: BadgeVariants.Network,
            name: badgeName,
            imageSource: NetworkBadgeSource,
          }}
        >
          {asset.isETH ? (
            <NetworkMainAssetLogo style={styles.ethLogo} testID={'eth-logo'} />
          ) : (
            <AvatarToken
              variant={AvatarVariants.Token}
              name={asset.symbol}
              imageSource={{ uri: asset.logo }}
              size={AvatarSize.Sm}
            />
          )}
        </BadgeWrapper>

        <View style={styles.balances} testID={'balance'}>
          <Text variant={TextVariant.BodyLGMedium}>{asset.name}</Text>

          <Text variant={TextVariant.BodyMD} style={styles.balanceFiat}>
            {mainBalance}
          </Text>
        </View>
      </AssetElement>
    );
  };

  const showDetectedTokens = () => {
    navigation.navigate(...createDetectedTokensNavDetails());
    InteractionManager.runAfterInteractions(() => {
      trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CLICKED, {
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

  const renderList = () => {
    const tokensToDisplay = hideZeroBalanceTokens
      ? tokens.filter((token) => {
          const { address, isETH } = token;
          return !isZero(tokenBalances[address]) || isETH;
        })
      : tokens;

    return (
      <View>
        {tokensToDisplay.map((item) => renderItem(item))}
        {renderTokensDetectedSection()}
        {renderFooter()}
      </View>
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
        trackEvent(MetaMetricsEvents.TOKENS_HIDDEN, {
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
