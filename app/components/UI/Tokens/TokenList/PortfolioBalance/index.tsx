import React from 'react';
import { View, TouchableOpacity } from 'react-native';
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
import {
  selectIsTokenNetworkFilterEqualCurrentNetwork,
  selectPrivacyMode,
} from '../../../../../selectors/preferencesController';
import { RootState } from '../../../../../reducers';
import { renderFiat } from '../../../../../util/number';
import {
  isPortfolioViewEnabled,
  isTestNet,
} from '../../../../../util/networks';
import { isPortfolioUrl } from '../../../../../util/url';
import createStyles from '../../styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import AggregatedPercentage from '../../../../../component-library/components-temp/Price/AggregatedPercentage';
import Icon, {
  IconSize,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { BrowserTab } from '../../types';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../../../locales/i18n';
import { EYE_SLASH_ICON_TEST_ID, EYE_ICON_TEST_ID } from './index.constants';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { useGetFormattedTokensPerChain } from '../../../../hooks/useGetFormattedTokensPerChain';
import {
  TotalFiatBalancesCrossChains,
  useGetTotalFiatBalanceCrossChains,
} from '../../../../hooks/useGetTotalFiatBalanceCrossChains';
import { InternalAccount } from '@metamask/keyring-api';
import { getChainIdsToPoll } from '../../../../../selectors/tokensController';
import AggregatedPercentageCrossChains from '../../../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains';
import { selectMultichainSelectedAccountCachedBalance } from '../../../../../selectors/multichain';

export const PortfolioBalance = () => {
  const { PreferencesController } = Engine.context;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const balance = Engine.getTotalFiatAccountBalance();

  const selectedInternalAccount: InternalAccount | undefined = useSelector(
    selectSelectedInternalAccount,
  );
  const allChainIDs = useSelector(getChainIdsToPoll);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );
  const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
    [selectedInternalAccount as InternalAccount],
    isTokenNetworkFilterEqualCurrentNetwork,
    allChainIDs,
  );
  const totalFiatBalancesCrossChain: TotalFiatBalancesCrossChains =
    useGetTotalFiatBalanceCrossChains(
      [selectedInternalAccount as InternalAccount],
      formattedTokensWithBalancesPerChain,
    );

  const tokenFiatBalancesCrossChains =
    totalFiatBalancesCrossChain[selectedInternalAccount?.address as string]
      ?.tokenFiatBalancesCrossChains ?? [];
  const totalFiatBalance =
    totalFiatBalancesCrossChain[selectedInternalAccount?.address as string]
      ?.totalFiatBalance ?? 0;
  const totalTokenFiat =
    totalFiatBalancesCrossChain[selectedInternalAccount?.address as string]
      ?.totalTokenFiat ?? 0;

  const navigation = useNavigation();
  const { trackEvent, isEnabled, createEventBuilder } = useMetrics();

  const { type } = useSelector(selectProviderConfig);
  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const browserTabs = useSelector((state: RootState) => state.browser.tabs);
  const privacyMode = useSelector(selectPrivacyMode);

  const multichainSelectedAccountCachedBalance = useSelector(
    selectMultichainSelectedAccountCachedBalance,
  );

  console.log(
    'multichainSelectedAccountCachedBalance',
    multichainSelectedAccountCachedBalance,
  );

  const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
    chainId,
    ticker,
    type,
  );

  let total;
  if (isOriginalNativeTokenSymbol) {
    if (isPortfolioViewEnabled()) {
      total = totalFiatBalance ?? 0;
    } else {
      const tokenFiatTotal = balance?.tokenFiat ?? 0;
      const ethFiatTotal = balance?.ethFiat ?? 0;
      total = tokenFiatTotal + ethFiatTotal;
    }
  } else if (isPortfolioViewEnabled()) {
    total = totalTokenFiat ?? 0;
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
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PORTFOLIO_LINK_CLICKED)
        .addProperties({
          portfolioUrl: AppConstants.PORTFOLIO.URL,
        })
        .build(),
    );
  };

  const renderAggregatedPercentage = () => {
    if (isTestNet(chainId)) {
      return null;
    }

    if (isPortfolioViewEnabled()) {
      return (
        <AggregatedPercentageCrossChains
          privacyMode={privacyMode}
          totalFiatCrossChains={totalFiatBalance}
          tokenFiatBalancesCrossChains={tokenFiatBalancesCrossChains}
        />
      );
    }
    return (
      <AggregatedPercentage
        privacyMode={privacyMode}
        ethFiat={balance?.ethFiat}
        tokenFiat={balance?.tokenFiat}
        tokenFiat1dAgo={balance?.tokenFiat1dAgo}
        ethFiat1dAgo={balance?.ethFiat1dAgo}
      />
    );
  };

  const toggleIsBalanceAndAssetsHidden = (value: boolean) => {
    PreferencesController.setPrivacyMode(value);
  };

  return (
    <View style={styles.portfolioBalance}>
      <View>
        <View>
          <View style={styles.balanceContainer}>
            <SensitiveText
              isHidden={privacyMode}
              length={SensitiveTextLength.Long}
              testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
              variant={TextVariant.DisplayMD}
            >
              {fiatBalance}
            </SensitiveText>
            <TouchableOpacity
              onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
              testID="balance-container"
            >
              <Icon
                style={styles.privacyIcon}
                name={privacyMode ? IconName.EyeSlash : IconName.Eye}
                size={IconSize.Md}
                color={colors.text.muted}
                testID={privacyMode ? EYE_SLASH_ICON_TEST_ID : EYE_ICON_TEST_ID}
              />
            </TouchableOpacity>
          </View>

          {renderAggregatedPercentage()}
        </View>
      </View>
      <View style={styles.portfolioButtonContainer}>
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
    </View>
  );
};
