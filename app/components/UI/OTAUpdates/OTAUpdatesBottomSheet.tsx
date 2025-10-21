import React, { useEffect, useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useUpdates, reloadAsync, channel, updateId } from 'expo-updates';
import Button from '../../../component-library/components/Buttons/Button';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button/Button.types';
import { Box } from '@metamask/design-system-react-native';

const OTAUpdatesBottomSheet = ({
  setOpenOTAUpdatesBottomSheet,
}: {
  setOpenOTAUpdatesBottomSheet: (open: boolean) => void;
}) => {
  const { currentlyRunning, isUpdateAvailable, isUpdatePending, checkError } =
    useUpdates();
  const runTypeMessage = currentlyRunning.isEmbeddedLaunch
    ? 'This app is running from built-in code'
    : 'This app is running an update';

  const updateRuntimeVersion = currentlyRunning.runtimeVersion;
  const error = checkError?.message;

  useEffect(() => {
    // do not prompt for social login flow
    if (isUpdatePending) {
      // Update has successfully downloaded; apply it now
      reloadAsync();
    }
  }, [isUpdatePending]);

  const sheetRef = useRef<BottomSheetRef>(null);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      keyboardAvoidingViewEnabled={false}
      isFullscreen
      onClose={() => setOpenOTAUpdatesBottomSheet(false)}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSM}>OTA Updates</Text>
      </BottomSheetHeader>
      <Box twClassName="p-4">
        <Text variant={TextVariant.BodyMD}>
          This modal is used for testing the OTA updates feature. If you are
          seeing this, please use another build
        </Text>
      </Box>
      <Box twClassName="pt-10 pb-10 px-4">
        <Text variant={TextVariant.BodyMDBold}>{runTypeMessage}</Text>
        {error && <Text variant={TextVariant.BodyMDBold}>{error}</Text>}
        {isUpdateAvailable && (
          <Text variant={TextVariant.BodyMDBold}>Update available</Text>
        )}
        {isUpdatePending && (
          <Text variant={TextVariant.BodyMDBold}>Update pending</Text>
        )}
        <Text variant={TextVariant.BodyMDBold}>Updates Channel:{channel}</Text>
        <Text variant={TextVariant.BodyMDBold}>
          Updates Update ID:{updateId}
        </Text>
        <Text variant={TextVariant.BodyMDBold}>
          Updates Runtime Version:{updateRuntimeVersion}
        </Text>
      </Box>
      <Box twClassName="flex-row items-center justify-center p-4">
        {isUpdateAvailable && (
          <Button
            label="Reload"
            onPress={() => reloadAsync()}
            variant={ButtonVariants.Primary}
          />
        )}
      </Box>
    </BottomSheet>
  );
};

export default React.memo(OTAUpdatesBottomSheet);
