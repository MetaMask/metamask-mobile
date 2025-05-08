import React, { useCallback, useEffect, useState } from 'react';
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
import Icon, {
  IconSize,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { BrowserTab } from '../../types';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../../../locales/i18n';
import { EYE_SLASH_ICON_TEST_ID, EYE_ICON_TEST_ID } from './index.constants';
import AggregatedPercentageCrossChains from '../../../../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains';
import { useSelectedAccountMultichainBalances } from '../../../../hooks/useMultichainBalances';
import Loader from '../../../../../component-library/components-temp/Loader/Loader';
import NonEvmAggregatedPercentage from '../../../../../component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import { isCardHolder } from './card.utils';
import { getGlobalChainId } from '../../../../../util/networks/global-network';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';

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

  const { selectedAccountMultichainBalance } =
    useSelectedAccountMultichainBalances();
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const [showCardButton, setShowCardButton] = useState(false);
  const { NetworkController } = Engine.context;
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);

  // Check if the user is a card holder
  useEffect(() => {
    const checkCardHolder = async () => {
      if (selectedAddress) {
        const networkId = getGlobalChainId(NetworkController);
        const isHolder = await isCardHolder(
          // selectedAddress,
          "0xFe4F94B62C04627C2677bF46FB249321594d0d79",
          networkId
        );
        setShowCardButton(isHolder);
      }
    };

    checkCardHolder();
  }, [selectedAddress, NetworkController]);

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

  const onOpenCard = useCallback(() => {
    // Navigate to CardBalance component
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PORTFOLIO_LINK_CLICKED)
        .addProperties({
          cardUrl: 'CardBalance',
        })
        .build(),
    );
    
    // Navigate to the CardBalance component
    navigation.navigate(Routes.WALLET.TAB_STACK_FLOW, {
      screen: 'CardBalance',
    });
  }, [navigation, trackEvent, createEventBuilder]);

  const renderAggregatedPercentage = () => {
    if (
      !selectedAccountMultichainBalance ||
      !selectedAccountMultichainBalance?.shouldShowAggregatedPercentage ||
      selectedAccountMultichainBalance?.totalFiatBalance === undefined
    ) {
      return null;
    }

    if (!isEvmSelected) {
      return <NonEvmAggregatedPercentage privacyMode={privacyMode} />;
    }

    return (
      <AggregatedPercentageCrossChains
        privacyMode={privacyMode}
        totalFiatCrossChains={selectedAccountMultichainBalance.totalFiatBalance}
        tokenFiatBalancesCrossChains={
          selectedAccountMultichainBalance.tokenFiatBalancesCrossChains
        }
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
          {selectedAccountMultichainBalance?.displayBalance ? (
            <View style={styles.balanceContainer}>
              <SensitiveText
                isHidden={privacyMode}
                length={SensitiveTextLength.Long}
                testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
                variant={TextVariant.DisplayMD}
              >
                {selectedAccountMultichainBalance.displayBalance}
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
                  testID={
                    privacyMode ? EYE_SLASH_ICON_TEST_ID : EYE_ICON_TEST_ID
                  }
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loaderWrapper}>
              <Loader />
            </View>
          )}

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
        
        {showCardButton && (
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Md}
            width={ButtonWidthTypes.Full}
            style={[styles.buyButton, { marginTop: 8 }]}
            onPress={onOpenCard}
            label={strings('asset_overview.card_button')}
            testID="metamask-card-button"
            endIconName={IconName.Card}
          />
        )}
      </View>
    </View>
  );
});
