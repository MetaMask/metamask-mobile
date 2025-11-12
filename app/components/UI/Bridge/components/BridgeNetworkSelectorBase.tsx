import React from 'react';
import { ScrollView } from 'react-native';

import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';
import { ButtonIconSizes } from '../../../../component-library/components/Buttons/ButtonIcon';
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
          size: ButtonIconSizes.Lg,
        }}
      >
        {strings('bridge.select_network')}
      </BottomSheetHeader>

      <ScrollView>{children}</ScrollView>
    </BottomSheet>
  );
};
