import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import useIsOriginalNativeTokenSymbol from '../../../../hooks/useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { useMetrics } from '../../../../hooks/useMetrics';
import { useTheme } from '../../../../../util/theme';
import AppConstants from '../../../../../core/AppConstants';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  selectChainId,
  selectProviderConfig,
  selectTicker,
} from '../../../../../selectors/networkController';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { RootState } from '../../../../../reducers';
import { renderFiat } from '../../../../../util/number';
import { isTestNet } from '../../../../../util/networks';
import { isPortfolioUrl } from '../../../../../util/url';
import createStyles from '../../styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text from '../../../../../component-library/components/Texts/Text';
import AggregatedPercentage from '../../../../../component-library/components-temp/Price/AggregatedPercentage';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { BrowserTab } from '../../types';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../../../locales/i18n';

export const PortfolioBalance = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const balance = Engine.getTotalFiatAccountBalance();
  const navigation = useNavigation();
  const { trackEvent, isEnabled } = useMetrics();

  const { type } = useSelector(selectProviderConfig);
  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const browserTabs = useSelector((state: RootState) => state.browser.tabs);

  const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
    chainId,
    ticker,
    type,
  );

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
    <View style={styles.portfolioBalance}>
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
