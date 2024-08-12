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
import { getDecimalChainId } from '../../../util/networks';

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
  const explorer = useBlockExplorer(providerConfig, networkConfigurations);
  const { trackEvent } = useMetrics();

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
