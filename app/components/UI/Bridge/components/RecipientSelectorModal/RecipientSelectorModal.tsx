import React from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import DestinationAccountSelector from '../DestinationAccountSelector.tsx';

const RecipientSelectorModal: React.FC = () => {
  const navigation = useNavigation();

  const handleClose = () => {
    navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
    });
  };

  return (
    <BottomSheet onClose={handleClose} keyboardAvoidingViewEnabled>
      <DestinationAccountSelector />
    </BottomSheet>
  );
};

export default RecipientSelectorModal;
