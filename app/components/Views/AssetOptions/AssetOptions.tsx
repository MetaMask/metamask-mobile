import { useNavigation } from '@react-navigation/native';
import React, { useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../component-library/hooks';
import { strings } from '../../../../locales/i18n';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import useBlockExplorer from '../../../components/UI/Swaps/utils/useBlockExplorer';
import { selectProviderConfig } from '../../../selectors/networkController';
import { selectFrequentRpcList } from '../../../selectors/preferencesController';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import styleSheet from './AssetOptions.styles';

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
  const frequentRpcList = useSelector(selectFrequentRpcList);
  const explorer = useBlockExplorer(providerConfig, frequentRpcList);

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
