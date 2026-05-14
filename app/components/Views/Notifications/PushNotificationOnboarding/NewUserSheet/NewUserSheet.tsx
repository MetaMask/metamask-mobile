import React, { useRef, useCallback } from 'react';
import { Image } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
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
  faded?: boolean;
}

function NotifCard({
  eyebrow,
  timestamp,
  title,
  message,
  faded,
}: NotifCardProps) {
  const tw = useTailwind();

  const card = (
    <Box twClassName="flex-row items-start gap-3 rounded-[14px] bg-alternative p-3">
      <Box twClassName="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-default">
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
        <Text variant={TextVariant.BodySm} twClassName="font-semibold">
          {title}
        </Text>
        <Text variant={TextVariant.BodySm} twClassName="mt-0.5 text-default">
          {message}
        </Text>
      </Box>
    </Box>
  );

  if (!faded) {
    return card;
  }

  return (
    <MaskedView
      maskElement={
        <LinearGradient
          colors={['black', 'black', 'transparent']}
          locations={[0, 0.33, 1]}
          style={tw.style('flex-1')}
        />
      }
    >
      {card}
    </MaskedView>
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
      <Box twClassName="px-6 pb-8 pt-6">
        <Box twClassName="mb-6 gap-2">
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
          <NotifCard
            eyebrow={strings(
              'notifications.push_onboarding.new_user.preview_card_2.eyebrow',
            )}
            timestamp={strings(
              'notifications.push_onboarding.new_user.preview_card_2.time',
            )}
            title={strings(
              'notifications.push_onboarding.new_user.preview_card_2.title',
            )}
            message={strings(
              'notifications.push_onboarding.new_user.preview_card_2.message',
            )}
            faded
          />
        </Box>

        <Text
          variant={TextVariant.HeadingSm}
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

        <Box twClassName="gap-3">
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
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleNotNow}
            twClassName="rounded-xl"
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
