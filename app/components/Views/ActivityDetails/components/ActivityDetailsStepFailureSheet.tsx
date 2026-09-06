import React, { useCallback, useRef } from 'react';
import { Modal, View } from 'react-native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { ActivityDetailsBlockExplorerButton } from './ActivityDetailsFooter';

/**
 * Explains a failed step, with the block explorer as a labelled button rather
 * than the row's export icon. The button hides itself when the transaction has
 * no explorer link, so a linkless failure still gets a sheet.
 */
export function ActivityDetailsStepFailureSheet({
  chainId,
  hash,
  message,
  onClose,
}: {
  chainId?: string;
  hash?: string;
  message: string;
  onClose: () => void;
}) {
  const sheetRef = useRef<BottomSheetRef>(null);

  const dismiss = useCallback(() => sheetRef.current?.onCloseBottomSheet(), []);

  return (
    <View>
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={dismiss}
      >
        <BottomSheet
          ref={sheetRef}
          onClose={onClose}
          testID={ActivityDetailsSelectorsIDs.STEP_FAILURE_SHEET}
        >
          <BottomSheetHeader onClose={dismiss}>
            {strings('activity_details.failure.title')}
          </BottomSheetHeader>
          <Box twClassName="gap-4 px-4 pb-4">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={ActivityDetailsSelectorsIDs.STEP_FAILURE_MESSAGE}
            >
              {message}
            </Text>
            <ActivityDetailsBlockExplorerButton
              chainId={chainId}
              hash={hash}
              onNavigate={onClose}
            />
          </Box>
        </BottomSheet>
      </Modal>
    </View>
  );
}
