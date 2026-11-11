import React, { useCallback, useRef } from 'react';
import { Modal } from 'react-native';
import type { Identifier } from '@metamask/mfa-recovery-controller';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MIN_CUBIST_IDENTIFIERS } from './manageCubistIdentifiers';

export const CUBIST_IDENTIFIERS_SHEET_TEST_ID =
  'mfa-recovery-dev-cubist-identifiers-sheet';
export const CUBIST_IDENTIFIER_ROW_TEST_ID =
  'mfa-recovery-dev-cubist-identifier-row';

interface CubistIdentifiersBottomSheetProps {
  identifiers: readonly Identifier[];
  /** Called with the identifier to remove; the caller unmounts the sheet. */
  onRemove: (identifier: Identifier) => void;
  onClose: () => void;
}

const CubistIdentifiersBottomSheet = ({
  identifiers,
  onRemove,
  onClose,
}: CubistIdentifiersBottomSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const canRemove = identifiers.length > MIN_CUBIST_IDENTIFIERS;

  const handleRequestClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <BottomSheet
        ref={sheetRef}
        keyboardAvoidingViewEnabled={false}
        onClose={onClose}
        testID={CUBIST_IDENTIFIERS_SHEET_TEST_ID}
      >
        <BottomSheetHeader onClose={handleRequestClose}>
          {strings(
            'app_settings.developer_options.mfa_recovery.cubist_identifiers_sheet_title',
          )}
        </BottomSheetHeader>
        <Box twClassName="flex flex-col gap-2 px-4 pb-4">
          {!canRemove && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings(
                'app_settings.developer_options.mfa_recovery.cubist_identifiers_minimum',
                { minimum: MIN_CUBIST_IDENTIFIERS },
              )}
            </Text>
          )}
          {identifiers.map((identifier) => (
            <Button
              key={`${identifier.type}:${identifier.namespace}:${identifier.value}`}
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={!canRemove}
              onPress={() => onRemove(identifier)}
              testID={`${CUBIST_IDENTIFIER_ROW_TEST_ID}-${identifier.type}`}
            >
              {`${identifier.type} · ${identifier.namespace}`}
            </Button>
          ))}
        </Box>
      </BottomSheet>
    </Modal>
  );
};

export default CubistIdentifiersBottomSheet;
