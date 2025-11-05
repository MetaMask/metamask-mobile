import React, { useRef, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import { ErrorModalProps } from './ErrorModal.types';
import createStyles from './ErrorModal.styles';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';

export const createErrorModalNavigationDetails = createNavigationDetails(
  Routes.RAMP.COMPONENTS.ERROR,
);

const ErrorModal = React.memo<ErrorModalProps>(
  ({
    isVisible,
    onClose,
    title,
    description,
    testID = 'ramps-error-modal',
  }) => {
    const { styles } = useStyles(createStyles, {});
    const bottomSheetRef = useRef<BottomSheetRef>(null);

    const handleGotItPress = useCallback(() => {
      bottomSheetRef.current?.onCloseBottomSheet();
    }, []);

    const modalTitle = useMemo(
      () => title || strings('ramps.error.title'),
      [title],
    );

    const modalDescription = useMemo(
      () => description || strings('ramps.error.description'),
      [description],
    );

    const buttonLabel = useMemo(() => strings('ramps.error.got_it_button'), []);

    const footerButtons = useMemo(
      () => [
        {
          label: buttonLabel,
          onPress: handleGotItPress,
          variant: ButtonVariants.Primary,
          size: ButtonSize.Lg,
          testID: `${testID}-got-it-button`,
        },
      ],
      [buttonLabel, handleGotItPress, testID],
    );

    if (!isVisible || !modalTitle) return null;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        shouldNavigateBack={false}
        onClose={onClose}
        testID={testID}
      >
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingMD} testID={`${testID}-title`}>
            {modalTitle}
          </Text>
        </BottomSheetHeader>
        <View style={styles.contentContainer}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            testID={`${testID}-description`}
          >
            {modalDescription}
          </Text>
        </View>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          buttonPropsArray={footerButtons}
          style={styles.footerContainer}
        />
      </BottomSheet>
    );
  },
);

export default ErrorModal;
