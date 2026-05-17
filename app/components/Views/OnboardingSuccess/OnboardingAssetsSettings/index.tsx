import React from 'react';
import { ScrollView } from 'react-native';
import { useOnboardingHeader } from '../../../hooks/useOnboardingHeader';
import { strings } from '../../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import AutoDetectTokensSettings from '../../Settings/AutoDetectTokensSettings';
import DisplayNFTMediaSettings from '../../Settings/DisplayNFTMediaSettings';
import AutoDetectNFTSettings from '../../Settings/AutoDetectNFTSettings';
import IPFSGatewaySettings from '../../Settings/IPFSGatewaySettings';
import BatchAccountBalanceSettings from '../../Settings/BatchAccountBalanceSettings';

const AssetSettings = () => {
  useOnboardingHeader(strings('default_settings.drawer_assets_title'));
  const tw = useTailwind();

  return (
    <ScrollView
      contentContainerStyle={tw.style('pb-[75px]')}
      style={tw.style('flex-1 px-4 py-2 pb-4')}
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
