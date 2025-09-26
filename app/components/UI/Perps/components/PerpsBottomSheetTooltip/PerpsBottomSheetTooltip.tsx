/* eslint-disable jsdoc/check-indentation */
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
import { PerpsBottomSheetTooltipProps } from './PerpsBottomSheetTooltip.types';
import createStyles from './PerpsBottomSheetTooltip.styles';
import { tooltipContentRegistry } from './content/contentRegistry';
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

/**
 * Tip: If want to render the PerpsBottomSheetTooltip from the root (not constrained by a parent component),
 * Wrap the PerpsBottomSheetTooltip in a <Modal> (react-native) component.
 *
 * Known compatibility issue:
 * - On Android, the PerpsBottomSheetTooltip is not rendered correctly when wrapped in a <Modal> component.
 * Fixed by wrapping the <Modal> in a plain <View> component.
 *
 * Example:
 * {isEligibilityModalVisible && (
 *   <View>
 *     <Modal visible transparent animationType="fade">
 *       <PerpsBottomSheetTooltip isVisible onClose={() => setIsEligibilityModalVisible(false)} contentKey={'geo_block'} />
 *     </Modal>
 *   </View>
 * )}
 */
const PerpsBottomSheetTooltip = React.memo<PerpsBottomSheetTooltipProps>(
  ({
    isVisible,
    onClose,
    contentKey,
    testID = PerpsBottomSheetTooltipSelectorsIDs.TOOLTIP,
    buttonConfig: buttonConfigProps,
    data,
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
            data={data}
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

    const buttonConfigDefault = useMemo(
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

    const footerButtons = useMemo(
      () => buttonConfigProps || buttonConfigDefault,
      [buttonConfigProps, buttonConfigDefault],
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
