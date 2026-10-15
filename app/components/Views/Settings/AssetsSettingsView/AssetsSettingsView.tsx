import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { HeaderStandard } from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import BatchAccountBalanceSettings from '../BatchAccountBalanceSettings';
import DisplayNFTMediaSettings from '../DisplayNFTMediaSettings';
import AutoDetectNFTSettings from '../AutoDetectNFTSettings';
import IPFSGatewaySettings from '../IPFSGatewaySettings';
import { selectProviderType } from '../../../../selectors/networkController';
import { MAINNET } from '../../../../constants/network';

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 64 },
});

const AssetsSettingsView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();
  const isMainnet = useSelector(selectProviderType) === MAINNET;

  return (
    <SafeAreaView
      style={[styles.wrapper, { backgroundColor: colors.background.default }]}
    >
      <HeaderStandard
        title={strings('app_settings.entries.assets')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BatchAccountBalanceSettings />
        <DisplayNFTMediaSettings />
        {isMainnet ? <AutoDetectNFTSettings /> : null}
        <IPFSGatewaySettings />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AssetsSettingsView;
