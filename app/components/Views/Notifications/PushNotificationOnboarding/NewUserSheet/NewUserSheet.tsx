import React, { useRef, useCallback } from 'react';
import { Image } from 'react-native';
import {
  Theme,
  useTailwind,
  useTheme,
} from '@metamask/design-system-twrnc-preset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { NewUserSheetSelectorsIDs } from './NewUserSheet.testIds';
import FoxImage from '../../../../../images/branding/fox.png';

export interface NewUserSheetProps {
  isVisible: boolean;
  onClose: (hasPendingAction?: boolean) => void;
  onYes?: () => void;
  onNotNow?: () => void;
  testID?: string;
}

interface NotifCardProps {
  eyebrow: string;
  timestamp: string;
  title: string;
  message: string;
}

function NotifCard({ eyebrow, timestamp, title, message }: NotifCardProps) {
  const tw = useTailwind();
  const theme = useTheme();
  const cardBackgroundClass =
    theme === Theme.Light ? 'bg-section' : 'bg-subsection';

  return (
    <Box
      twClassName={`flex-row items-start gap-3 rounded-[14px] border border-muted ${cardBackgroundClass} px-[14px] py-3`}
    >
      <Box twClassName="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
        <Image
          source={FoxImage}
          style={tw.style('h-[22px] w-[22px]')}
          resizeMode="contain"
        />
      </Box>
      <Box twClassName="min-w-0 flex-1">
        <Box twClassName="mb-0.5 flex-row justify-between">
          <Text variant={TextVariant.BodyXs} twClassName="text-alternative">
            {eyebrow}
          </Text>
          <Text variant={TextVariant.BodyXs} twClassName="text-alternative">
            {timestamp}
          </Text>
        </Box>
        <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Bold}>
          {title}
        </Text>
        <Text variant={TextVariant.BodySm} twClassName="mt-0.5 text-default">
          {message}
        </Text>
      </Box>
    </Box>
  );
}

const NewUserSheet: React.FC<NewUserSheetProps> = ({
  isVisible,
  onClose,
  onYes,
  onNotNow,
  testID,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const closeWithAction = useCallback((action?: () => void) => {
    const callback = () => action?.();
    if (!bottomSheetRef.current) {
      callback();
      return;
    }
    bottomSheetRef.current.onCloseBottomSheet(callback);
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleYes = useCallback(() => {
    closeWithAction(onYes);
  }, [closeWithAction, onYes]);

  const handleNotNow = useCallback(() => {
    closeWithAction(onNotNow);
  }, [closeWithAction, onNotNow]);

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      testID={testID ?? NewUserSheetSelectorsIDs.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: NewUserSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      />
      <Box twClassName="px-6 pb-8">
        <Box twClassName="mb-6 items-center">
          <NotifCard
            eyebrow={strings(
              'notifications.push_onboarding.new_user.preview_card_1.eyebrow',
            )}
            timestamp={strings(
              'notifications.push_onboarding.new_user.preview_card_1.time',
            )}
            title={strings(
              'notifications.push_onboarding.new_user.preview_card_1.title',
            )}
            message={strings(
              'notifications.push_onboarding.new_user.preview_card_1.message',
            )}
          />
        </Box>

        <Text
          variant={TextVariant.HeadingMd}
          twClassName="mb-3 text-center"
          testID={NewUserSheetSelectorsIDs.TITLE}
        >
          {strings('notifications.push_onboarding.new_user.title')}
        </Text>

        <Text
          variant={TextVariant.BodyMd}
          twClassName="mb-6 text-center text-alternative"
          testID={NewUserSheetSelectorsIDs.BODY}
        >
          {strings('notifications.push_onboarding.new_user.body')}
        </Text>

        <Box twClassName="gap-2">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleYes}
            twClassName="rounded-xl"
            testID={NewUserSheetSelectorsIDs.BUTTON_YES}
          >
            {strings('notifications.push_onboarding.new_user.button_yes')}
          </Button>
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleNotNow}
            testID={NewUserSheetSelectorsIDs.BUTTON_NOT_NOW}
          >
            {strings('notifications.push_onboarding.new_user.button_not_now')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default NewUserSheet;
