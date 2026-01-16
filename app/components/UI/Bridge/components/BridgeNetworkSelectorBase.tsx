import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';

import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';

import { useNavigation } from '@react-navigation/native';

interface BridgeNetworkSelectorBaseProps {
  children: React.ReactNode;
}

export const BridgeNetworkSelectorBase: React.FC<
  BridgeNetworkSelectorBaseProps
> = ({ children }) => {
  const navigation = useNavigation();

  return (
    <BottomSheet isFullscreen>
      <BottomSheetHeader
        onClose={() => navigation.goBack()}
        closeButtonProps={{
          testID: 'bridge-network-selector-close-button',
        }}
      >
        {strings('bridge.select_network')}
      </BottomSheetHeader>

      <ScrollView>{children}</ScrollView>
    </BottomSheet>
  );
};
