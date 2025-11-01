import React, { useRef, useCallback } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../hooks/useStyles';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { strings } from '../../../../../../locales/i18n';
import createStyles from './PerpsNotificationBottomSheet.styles';
import { useEnableNotifications } from '../../../../../util/notifications/hooks/useNotifications';

interface PerpsNotificationBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  testID?: string;
}

const PerpsNotificationBottomSheet: React.FC<
  PerpsNotificationBottomSheetProps
> = ({ isVisible, onClose, testID }) => {
  const { styles } = useStyles(createStyles, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const { enableNotifications, loading } = useEnableNotifications({
    nudgeEnablePush: true,
  });

  const handleTurnOnNotifications = useCallback(async () => {
    DevLogger.log(
      'PerpsNotificationBottomSheet: Turning on perps notifications',
    );

    try {
      await enableNotifications();
      DevLogger.log(
        'PerpsNotificationBottomSheet: Successfully enabled perps notifications',
      );
      bottomSheetRef.current?.onCloseBottomSheet();
    } catch (error) {
      DevLogger.log(
        'PerpsNotificationBottomSheet: Error enabling perps notifications',
        error,
      );
    }
  }, [enableNotifications]);

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      testID={testID}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant={TextVariant.HeadingMD} style={styles.title}>
            {strings('perps.tooltips.notifications.title')}
          </Text>
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.description}
        >
          {strings('perps.tooltips.notifications.description')}
        </Text>

        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('perps.tooltips.notifications.turn_on_button')}
          onPress={handleTurnOnNotifications}
          testID={`${testID}-turn-on-button`}
          style={styles.turnOnButton}
          loading={loading}
        />
      </View>
    </BottomSheet>
  );
};

export default PerpsNotificationBottomSheet;
