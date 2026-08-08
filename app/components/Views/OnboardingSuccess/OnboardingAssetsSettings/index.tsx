import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import AutoDetectTokensSettings from '../../Settings/AutoDetectTokensSettings';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import DisplayNFTMediaSettings from '../../Settings/DisplayNFTMediaSettings';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import AutoDetectNFTSettings from '../../Settings/AutoDetectNFTSettings';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import IPFSGatewaySettings from '../../Settings/IPFSGatewaySettings';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import BatchAccountBalanceSettings from '../../Settings/BatchAccountBalanceSettings';

const AssetSettings = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandard
        includesTopInset
        title={strings('default_settings.drawer_assets_title')}
        onBack={() => navigation.goBack()}
      />
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
    </Box>
  );
};

export default AssetSettings;
