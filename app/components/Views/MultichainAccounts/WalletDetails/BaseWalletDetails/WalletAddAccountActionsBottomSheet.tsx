import React, { useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import WalletAddAccountActions from './WalletAddAccountActions';

interface WalletAddAccountActionsBottomSheetProps {
  route: {
    params: {
      keyringId: string;
    };
  };
}

const WalletAddAccountActionsBottomSheet = ({
  route,
}: WalletAddAccountActionsBottomSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { keyringId } = route?.params || {};

  const handleBack = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <WalletAddAccountActions onBack={handleBack} keyringId={keyringId} />
    </BottomSheet>
  );
};

export default WalletAddAccountActionsBottomSheet;
