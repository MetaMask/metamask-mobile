import React, { useCallback, useEffect, useRef } from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  BottomSheet,
  BottomSheetHeader,
  IconName,
  ListItem,
  ListItemVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { ImportFromSeedSelectorsIDs } from './ImportFromSeed.testIds';

interface ImportOptionsSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectQrCode: () => void;
  onSelectExtension: () => void;
}

const ImportOptionsSheet = ({
  isVisible,
  onClose,
  onSelectQrCode,
  onSelectExtension,
}: ImportOptionsSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleSelectQrCode = useCallback(() => {
    onClose();
    onSelectQrCode();
  }, [onClose, onSelectQrCode]);

  const handleSelectExtension = useCallback(() => {
    onClose();
    onSelectExtension();
  }, [onClose, onSelectExtension]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      testID={ImportFromSeedSelectorsIDs.IMPORT_OPTIONS_SHEET_ID}
    >
      <BottomSheetHeader
        onClose={onClose}
        closeButtonProps={{
          testID: ImportFromSeedSelectorsIDs.IMPORT_OPTIONS_SHEET_CLOSE_ID,
        }}
      >
        {strings('import_from_seed.import_menu_title')}
      </BottomSheetHeader>
      <ListItem
        isInteractive
        variant={ListItemVariant.TwoLines}
        avatar={
          <AvatarIcon
            iconName={IconName.Scan}
            severity={AvatarIconSeverity.Neutral}
            size={AvatarIconSize.Lg}
          />
        }
        title={strings('import_from_seed.import_from_srp_qr')}
        onPress={handleSelectQrCode}
        testID={ImportFromSeedSelectorsIDs.IMPORT_FROM_SRP_QR_OPTION_ID}
      />
      <ListItem
        isInteractive
        variant={ListItemVariant.TwoLines}
        avatar={
          <AvatarIcon
            iconName={IconName.Monitor}
            severity={AvatarIconSeverity.Neutral}
            size={AvatarIconSize.Lg}
          />
        }
        title={strings('import_from_seed.import_from_extension_menu')}
        onPress={handleSelectExtension}
        testID={ImportFromSeedSelectorsIDs.IMPORT_FROM_EXTENSION_OPTION_ID}
      />
    </BottomSheet>
  );
};

export default ImportOptionsSheet;
