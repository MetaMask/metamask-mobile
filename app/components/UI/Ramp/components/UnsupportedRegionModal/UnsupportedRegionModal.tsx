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
import { UnsupportedRegionModalProps } from './UnsupportedRegionModal.types';
import createStyles from './UnsupportedRegionModal.styles';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';

export const createUnsupportedRegionModalNavigationDetails =
  createNavigationDetails(Routes.RAMP.COMPONENTS.UNSUPPORTED_REGION);

const UnsupportedRegionModal = React.memo<UnsupportedRegionModalProps>(
  ({ isVisible, onClose, testID = 'ramps-unsupported-region-modal' }) => {
    const { styles } = useStyles(createStyles, {});
    const bottomSheetRef = useRef<BottomSheetRef>(null);

    const handleGotItPress = useCallback(() => {
      bottomSheetRef.current?.onCloseBottomSheet();
    }, []);

    const title = useMemo(() => strings('ramps.unsupported_region.title'), []);

    const description = useMemo(
      () => strings('ramps.unsupported_region.description'),
      [],
    );

    const buttonLabel = useMemo(
      () => strings('ramps.unsupported_region.got_it_button'),
      [],
    );

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

    if (!isVisible || !title) return null;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        shouldNavigateBack={false}
        onClose={onClose}
        testID={testID}
      >
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingMD} testID={`${testID}-title`}>
            {title}
          </Text>
        </BottomSheetHeader>
        <View style={styles.contentContainer}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            testID={`${testID}-description`}
          >
            {description}
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

export default UnsupportedRegionModal;
