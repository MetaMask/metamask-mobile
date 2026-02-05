/* eslint-disable jsdoc/check-indentation */
import React, { useRef, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
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
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../Perps.testIds';
import {
  PERPS_EVENT_VALUE,
  PERPS_EVENT_PROPERTY,
} from '../../constants/eventNames';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';

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

    const { track } = usePerpsEventTracking();

    const handleClose = useCallback(() => {
      bottomSheetRef.current?.onCloseBottomSheet();
    }, []);

    // Memoize the button handler to prevent recreation
    const handleGotItPress = useCallback(() => {
      // Track tooltip button click
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.TOOLTIP,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          PERPS_EVENT_VALUE.BUTTON_LOCATION.TOOLTIP,
      });
      handleClose();
    }, [track, handleClose]);

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

    // Content keys that render their own header (with icon)
    const hasCustomHeader =
      contentKey === 'market_hours' || contentKey === 'after_hours_trading';

    // Only render when visible and title is defined
    if (!isVisible || !title) return null;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        shouldNavigateBack={false}
        onClose={onClose}
        testID={testID}
      >
        {!hasCustomHeader && (
          <HeaderCenter
            title={title}
            testID={PerpsBottomSheetTooltipSelectorsIDs.TITLE}
            onClose={handleClose}
          />
        )}
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
