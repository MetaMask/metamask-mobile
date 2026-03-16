import React from 'react';
import { ScrollView } from 'react-native';
import { useOnboardingHeader } from '../../../hooks/useOnboardingHeader';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import AutoDetectTokensSettings from '../../Settings/AutoDetectTokensSettings';
import DisplayNFTMediaSettings from '../../Settings/DisplayNFTMediaSettings';
import AutoDetectNFTSettings from '../../Settings/AutoDetectNFTSettings';
import IPFSGatewaySettings from '../../Settings/IPFSGatewaySettings';
import BatchAccountBalanceSettings from '../../Settings/BatchAccountBalanceSettings';
import styleSheet from './index.styles';

const AssetSettings = () => {
  useOnboardingHeader(strings('default_settings.drawer_assets_title'));
  const { styles } = useStyles(styleSheet, {});

  return (
    <ScrollView
      contentContainerStyle={styles.contentContainerStyle}
      style={styles.root}
    >
      <AutoDetectTokensSettings />
      <DisplayNFTMediaSettings />
      <AutoDetectNFTSettings />
      <IPFSGatewaySettings />
      <BatchAccountBalanceSettings />
    </ScrollView>
  );
};

export default AssetSettings;
