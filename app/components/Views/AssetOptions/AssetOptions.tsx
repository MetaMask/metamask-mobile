import { useNavigation } from '@react-navigation/native';
import React, { useRef } from 'react';
import { Text, TouchableOpacity, View, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import Routes from '../../../constants/navigation/Routes';
import { useStyles } from '../../../component-library/hooks';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { strings } from '../../../../locales/i18n';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import useBlockExplorer from '../../../components/UI/Swaps/utils/useBlockExplorer';
import {
  selectChainId,
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../selectors/networkController';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import styleSheet from './AssetOptions.styles';
import { selectTokenList } from '../../../selectors/tokenListController';
import Logger from '../../../util/Logger';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AppConstants from '../../../core/AppConstants';
import { getDecimalChainId } from '../../../util/networks';
import { isPortfolioUrl } from '../../../util/url';
import { BrowserTab } from '../../../components/UI/Tokens/types';
import { RootState } from '../../../reducers';
interface Option {
  label: string;
  onPress: () => void;
  icon: IconName;
}

interface Props {
  route: {
    params: {
      address: string;
      isNativeCurrency: boolean;
    };
  };
}

const AssetOptions = (props: Props) => {
  const { address, isNativeCurrency } = props.route.params;
  const { styles } = useStyles(styleSheet, {});
  const safeAreaInsets = useSafeAreaInsets();
  const navigation = useNavigation();
  const modalRef = useRef<ReusableModalRef>(null);
  const providerConfig = useSelector(selectProviderConfig);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const tokenList = useSelector(selectTokenList);
  const chainId = useSelector(selectChainId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const browserTabs = useSelector((state: any) => state.browser.tabs);
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );
  const explorer = useBlockExplorer(providerConfig, networkConfigurations);
  const { trackEvent, isEnabled } = useMetrics();

  const goToBrowserUrl = (url: string, title: string) => {
    modalRef.current?.dismissModal(() => {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url,
          title,
        },
      });
    });
  };

  const openOnBlockExplorer = () => {
    let url = '';
    const title = new URL(explorer.baseUrl).hostname;
    if (isNativeCurrency) {
      // Go to block explorer
      url = explorer.baseUrl;
    } else {
      // Go to token on block explorer
      url = explorer.token(address);
    }
    goToBrowserUrl(url, title);
  };

  const openTokenDetails = () => {
    modalRef.current?.dismissModal(() => {
      navigation.navigate('AssetDetails');
    });
  };

  const openPortfolio = () => {
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

  const removeToken = () => {
    const { TokensController } = Engine.context;
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: 'AssetHideConfirmation',
      params: {
        onConfirm: () => {
          navigation.navigate('WalletView');
          InteractionManager.runAfterInteractions(async () => {
            try {
              await TokensController.ignoreTokens([address]);
              NotificationManager.showSimpleNotification({
                status: `simple_notification`,
                duration: 5000,
                title: strings('wallet.token_toast.token_hidden_title'),
                description: strings('wallet.token_toast.token_hidden_desc', {
                  tokenSymbol: tokenList[address.toLowerCase()]?.symbol || null,
                }),
              });
              trackEvent(MetaMetricsEvents.TOKENS_HIDDEN, {
                location: 'token_details',
                token_standard: 'ERC20',
                asset_type: 'token',
                tokens: [
                  `${tokenList[address.toLowerCase()]?.symbol} - ${address}`,
                ],
                chain_id: getDecimalChainId(chainId),
              });
            } catch (err) {
              Logger.log(err, 'AssetDetails: Failed to hide token!');
            }
          });
        },
      },
    });
  };

  const renderOptions = () => {
    const options: Option[] = [];
    options.push({
      label: strings('asset_details.options.view_on_portfolio'),
      onPress: openPortfolio,
      icon: IconName.Export,
    });
    Boolean(explorer.baseUrl) &&
      options.push({
        label: strings('asset_details.options.view_on_block'),
        onPress: openOnBlockExplorer,
        icon: IconName.Export,
      });
    !isNativeCurrency &&
      options.push({
        label: strings('asset_details.options.token_details'),
        onPress: openTokenDetails,
        icon: IconName.DocumentCode,
      });
    !isNativeCurrency &&
      options.push({
        label: strings('asset_details.options.remove_token'),
        onPress: removeToken,
        icon: IconName.Trash,
      });
    return (
      <>
        {options.map((option) => {
          const { label, onPress, icon } = option;
          return (
            <View key={label}>
              <TouchableOpacity style={styles.optionButton} onPress={onPress}>
                <Icon name={icon} style={styles.icon} />
                <Text style={styles.optionLabel}>{label}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </>
    );
  };

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={[styles.sheet, { paddingBottom: safeAreaInsets.bottom }]}>
        <View style={styles.notch} />
        {renderOptions()}
      </View>
    </ReusableModal>
  );
};

export default AssetOptions;
