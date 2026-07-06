import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

export interface RampInfoBottomSheetAction {
  /** Button label */
  label: string;
  /** Button visual variant (Primary, Secondary, ...) */
  variant: ButtonVariant;
  /** Press handler. Defaults to closing the sheet when omitted. */
  onPress?: () => void;
  /** Optional testID for the button */
  testID?: string;
}

export interface RampInfoBottomSheetProps {
  /** testIDs for the sheet container and header close button */
  testIDs: {
    MODAL: string;
    CLOSE_BUTTON: string;
  };
  /** Heading shown in the sheet header */
  title: string;
  /** Heading variant (defaults to HeadingMd) */
  titleVariant?: TextVariant;
  /** Body copy shown under the header */
  description: string;
  /** Footer actions rendered as full-width buttons, in order */
  actions: RampInfoBottomSheetAction[];
}

/**
 * Shared bottom sheet for simple Ramp informational modals: a header title, a
 * body description, and one or more full-width dismiss/action buttons. Actions
 * default to closing the sheet unless they provide their own `onPress`.
 */
function RampInfoBottomSheet({
  testIDs,
  title,
  titleVariant = TextVariant.HeadingMd,
  description,
  actions,
}: RampInfoBottomSheetProps) {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const surfaceClass = useElevatedSurface();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      isInteractable={false}
      testID={testIDs.MODAL}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: testIDs.CLOSE_BUTTON,
        }}
      >
        <Text variant={titleVariant}>{title}</Text>
      </BottomSheetHeader>

      <Box twClassName="px-6 pb-6">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {description}
        </Text>
      </Box>

      <Box twClassName="gap-4 px-6 pb-6">
        {actions.map((action) => (
          <Button
            key={action.label}
            size={ButtonSize.Lg}
            onPress={action.onPress ?? handleClose}
            variant={action.variant}
            isFullWidth
            testID={action.testID}
          >
            {action.label}
          </Button>
        ))}
      </Box>
    </BottomSheet>
  );
}

export default RampInfoBottomSheet;
