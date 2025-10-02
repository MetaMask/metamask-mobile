import React from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
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
      <BottomSheetHeader onBack={handleClose} onClose={handleClose}>
        Recipient account
      </BottomSheetHeader>
      <DestinationAccountSelector />
    </BottomSheet>
  );
};

export default RecipientSelectorModal;
