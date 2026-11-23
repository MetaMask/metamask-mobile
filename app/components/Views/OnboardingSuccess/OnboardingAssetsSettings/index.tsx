import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '@metamask/design-system-react-native';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { useHeaderGlassInset } from '../../../../component-library/components-temp/HeaderGlass';
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
import { useSelector } from 'react-redux';
import { selectMobileUxBftcConsolidationFlagEnabled } from '../../../../selectors/featureFlagController/basicFunctionalityConsolidation';

const AssetSettings = () => {
  const tw = useTailwind();
  const { top: safeAreaTop } = useSafeAreaInsets();
  const { inset: headerInset, onLayout: onHeaderLayout } = useHeaderGlassInset(
    true,
    safeAreaTop,
  );
  const navigation = useNavigation<AppNavigationProp>();
  const isBasicFunctionalityConsolidationEnabled = useSelector(
    selectMobileUxBftcConsolidationFlagEnabled,
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandardGlass
        backdrop="static"
        onLayout={onHeaderLayout}
        includesTopInset
        title={strings('default_settings.drawer_assets_title')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={tw.style('pb-[75px]')}
        style={[tw.style('flex-1 px-4 py-2 pb-4'), { marginTop: headerInset }]}
      >
        {!isBasicFunctionalityConsolidationEnabled && (
          <>
            <AutoDetectTokensSettings />
            <DisplayNFTMediaSettings />
            <AutoDetectNFTSettings />
          </>
        )}
        <IPFSGatewaySettings />
        {!isBasicFunctionalityConsolidationEnabled && (
          <BatchAccountBalanceSettings />
        )}
      </ScrollView>
    </Box>
  );
};

export default AssetSettings;
