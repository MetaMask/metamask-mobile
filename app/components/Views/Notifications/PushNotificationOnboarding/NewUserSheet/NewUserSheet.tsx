import React, { useRef, useCallback } from 'react';
import { View, Image, Text as RNText } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import createStyles from './NewUserSheet.styles';
import { NewUserSheetSelectorsIDs } from './NewUserSheet.testIds';
import { useTheme } from '../../../../../util/theme';
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
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const card = (
    <View style={styles.notifCard}>
      <View style={styles.foxTile}>
        <Image source={FoxImage} style={styles.foxImage} resizeMode="contain" />
      </View>
      <View style={styles.notifTextBlock}>
        <View style={styles.notifHeader}>
          <RNText style={styles.notifEyebrow}>{eyebrow}</RNText>
          <RNText style={styles.notifTimestamp}>{timestamp}</RNText>
        </View>
        <RNText style={styles.notifTitle}>{title}</RNText>
        <RNText style={styles.notifMessage}>{message}</RNText>
      </View>
    </View>
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
          style={styles.fadeMask}
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
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
      <View style={styles.container}>
        <View style={styles.cardsStack}>
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
        </View>

        <RNText style={styles.title} testID={NewUserSheetSelectorsIDs.TITLE}>
          {strings('notifications.push_onboarding.new_user.title')}
        </RNText>

        <RNText style={styles.body} testID={NewUserSheetSelectorsIDs.BODY}>
          {strings('notifications.push_onboarding.new_user.body')}
        </RNText>

        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleYes}
            style={styles.button}
            testID={NewUserSheetSelectorsIDs.BUTTON_YES}
          >
            {strings('notifications.push_onboarding.new_user.button_yes')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleNotNow}
            style={styles.button}
            testID={NewUserSheetSelectorsIDs.BUTTON_NOT_NOW}
          >
            {strings('notifications.push_onboarding.new_user.button_not_now')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default NewUserSheet;
