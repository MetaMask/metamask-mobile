import React, { useRef, useState, LegacyRef } from 'react';
import { View } from 'react-native';
import ActionSheet from '@metamask/react-native-actionsheet';
import { useSelector } from 'react-redux';
import useTokenBalancesController from '../../hooks/useTokenBalancesController/useTokenBalancesController';
import { useTheme } from '../../../util/theme';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';
import {
  selectChainId,
  selectNetworkClientId,
} from '../../../selectors/networkController';
import { getDecimalChainId } from '../../../util/networks';
import { isZero } from '../../../util/lodash';
import createStyles from './styles';
import { TokenList } from './TokenList';
import { TokenI, TokensI } from './types';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';

// this will be imported from TokenRatesController when it is exported from there
// PR: https://github.com/MetaMask/core/pull/4622
export interface MarketDataDetails {
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
}

const Tokens: React.FC<TokensI> = ({ tokens }) => {
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();
  const { data: tokenBalances } = useTokenBalancesController();

  const chainId = useSelector(selectChainId);
  const networkClientId = useSelector(selectNetworkClientId);
  const hideZeroBalanceTokens = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.settings.hideZeroBalanceTokens,
  );

  const actionSheet = useRef<typeof ActionSheet>();
  const [tokenToRemove, setTokenToRemove] = useState<TokenI>();
  const [refreshing, setRefreshing] = useState(false);

  const styles = createStyles(colors);

  const showRemoveMenu = (token: TokenI) => {
    if (actionSheet.current) {
      setTokenToRemove(token);
      actionSheet.current.show();
    }
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

  const tokensToDisplay = hideZeroBalanceTokens
    ? tokens.filter((token) => {
        const { address, isETH } = token;
        return !isZero(tokenBalances[address]) || isETH;
      })
    : tokens;

  return (
    <View
      style={styles.wrapper}
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER}
    >
      <TokenList
        tokens={tokensToDisplay}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showRemoveMenu={showRemoveMenu}
      />
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
