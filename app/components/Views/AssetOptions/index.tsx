import React, { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontStyles } from '../../../styles/common';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import useBlockExplorer from '../../../components/UI/Swaps/utils/useBlockExplorer';

const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: { justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    notch: {
      width: 48,
      height: 5,
      borderRadius: 4,
      backgroundColor: colors.border.default,
      marginTop: 12,
      alignSelf: 'center',
      marginBottom: 24,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.muted,
    },
    optionButton: {
      height: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionLabel: {
      ...(fontStyles.normal as any),
      color: colors.primary.default,
      fontSize: 16,
    },
  });

interface Option {
  label: string;
  onPress: () => void;
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
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const safeAreaInsets = useSafeAreaInsets();
  const navigation = useNavigation();
  const modalRef = useRef<ReusableModalRef>(null);
  const provider = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController.provider,
  );
  const frequentRpcList = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );
  const explorer = useBlockExplorer(provider, frequentRpcList);

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
      });
    !isNativeCurrency &&
      options.push({
        label: strings('asset_details.options.token_details'),
        onPress: openTokenDetails,
      });
    return (
      <>
        {options.map((option) => {
          const { label, onPress } = option;
          return (
            <View key={label}>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.optionButton} onPress={onPress}>
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
