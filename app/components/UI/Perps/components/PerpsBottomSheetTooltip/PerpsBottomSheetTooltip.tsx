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
import { ButtonProps } from '../../../../../component-library/components/Buttons/Button/Button.types';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import { PerpsBottomSheetTooltipProps } from './PerpsBottomSheetTooltip.types';
import createStyles from './PerpsBottomSheetTooltip.styles';
import { tooltipContentRegistry } from './content/contentRegistry';
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const PerpsBottomSheetTooltip = React.memo<PerpsBottomSheetTooltipProps>(
  ({
    isVisible,
    onClose,
    contentKey,
    testID = PerpsBottomSheetTooltipSelectorsIDs.TOOLTIP,
  }) => {
    const { styles } = useStyles(createStyles, {});
    const bottomSheetRef = useRef<BottomSheetRef>(null);

    // Memoize the title to prevent recalculation on every render
    const title = useMemo(
      () => strings(`perps.tooltips.${contentKey}.title`),
      [contentKey],
    );

    // Memoize the content renderer to prevent recreation
    const renderContent = () => {
      const CustomRenderer = tooltipContentRegistry[contentKey];

      if (CustomRenderer) {
        return (
          <CustomRenderer
            testID={PerpsBottomSheetTooltipSelectorsIDs.CONTENT}
          />
        );
      }

      return (
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          testID={PerpsBottomSheetTooltipSelectorsIDs.CONTENT}
        >
          {strings(`perps.tooltips.${contentKey}.content`)}
        </Text>
      );
    };

    // Memoize the button handler to prevent recreation
    const handleGotItPress = useCallback(() => {
      bottomSheetRef.current?.onCloseBottomSheet();
    }, []);

    // Memoize button label and footer buttons
    const buttonLabel = useMemo(
      () => strings('perps.tooltips.got_it_button'),
      [],
    );

    const footerButtons = useMemo<ButtonProps[]>(
      () => [
        {
          label: buttonLabel,
          onPress: handleGotItPress,
          variant: ButtonVariants.Primary,
          size: ButtonSize.Lg,
          testID: PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON,
        },
      ],
      [buttonLabel, handleGotItPress],
    );

    // Only render when visible and title is defined
    if (!isVisible || !title) return null;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        shouldNavigateBack={false}
        onClose={onClose}
        testID={testID}
      >
        <BottomSheetHeader>
          <Text
            variant={TextVariant.HeadingMD}
            testID={PerpsBottomSheetTooltipSelectorsIDs.TITLE}
          >
            {title}
          </Text>
        </BottomSheetHeader>
        <View style={styles.contentContainer}>{renderContent()}</View>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          buttonPropsArray={footerButtons}
          style={styles.footerContainer}
        />
      </BottomSheet>
    );
  },
);

export default PerpsBottomSheetTooltip;
