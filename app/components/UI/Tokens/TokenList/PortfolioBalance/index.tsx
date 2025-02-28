import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useMetrics } from '../../../../hooks/useMetrics';
import { useTheme } from '../../../../../util/theme';
import AppConstants from '../../../../../core/AppConstants';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { RootState } from '../../../../../reducers';
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
import AggregatedPercentageCrossChains from '../../../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains';
import { useMultichainBalances } from '../../../../hooks/useMultichainBalances';

export const PortfolioBalance = React.memo(() => {
  const { PreferencesController } = Engine.context;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const browserTabs = useSelector((state: RootState) => state.browser.tabs);
  const privacyMode = useSelector(selectPrivacyMode);
  const isMultichainBalancesCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );
  const navigation = useNavigation();
  const { trackEvent, isEnabled, createEventBuilder } = useMetrics();

  const { multichainBalances } = useMultichainBalances();
  console.log(
    'multichainBalances',
    JSON.stringify(multichainBalances, null, 2),
  );

  const onOpenPortfolio = useCallback(() => {
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
        String(!!isMultichainBalancesCollectionForMarketingEnabled),
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
  }, [
    navigation,
    trackEvent,
    createEventBuilder,
    isEnabled,
    isMultichainBalancesCollectionForMarketingEnabled,
    browserTabs,
  ]);

  const renderAggregatedPercentage = () => {
    if (!multichainBalances.shouldShowAggregatedPercentage) {
      return null;
    }

    if (multichainBalances.isPortfolioVieEnabled) {
      return (
        <AggregatedPercentageCrossChains
          privacyMode={privacyMode}
          totalFiatCrossChains={multichainBalances.totalFiatBalance}
          tokenFiatBalancesCrossChains={
            multichainBalances.tokenFiatBalancesCrossChains
          }
        />
      );
    }

    return (
      <AggregatedPercentage
        privacyMode={privacyMode}
        ethFiat={multichainBalances.aggregatedBalance.ethFiat}
        tokenFiat={multichainBalances.aggregatedBalance.tokenFiat}
        tokenFiat1dAgo={multichainBalances.aggregatedBalance.tokenFiat1dAgo}
        ethFiat1dAgo={multichainBalances.aggregatedBalance.ethFiat1dAgo}
      />
    );
  };

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

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
              {multichainBalances.displayBalance}
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
});
