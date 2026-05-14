/* eslint-disable jsdoc/check-indentation */
import React, { useRef, useCallback, useMemo } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  ButtonSize,
  ButtonsAlignment,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsBottomSheetTooltipProps } from './PerpsBottomSheetTooltip.types';
import { tooltipContentRegistry } from './content/contentRegistry';
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../Perps.testIds';
import {
  PERPS_EVENT_VALUE,
  PERPS_EVENT_PROPERTY,
} from '@metamask/perps-controller';
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
    buttonLocation,
  }) => {
    const bottomSheetRef = useRef<BottomSheetRef>(null);

    const title = useMemo(
      () => strings(`perps.tooltips.${contentKey}.title`),
      [contentKey],
    );

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
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
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

    const handleGotItPress = useCallback(() => {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.TOOLTIP,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          buttonLocation ?? PERPS_EVENT_VALUE.BUTTON_LOCATION.TOOLTIP,
      });
      handleClose();
    }, [track, handleClose, buttonLocation]);

    const buttonLabel = useMemo(
      () => strings('perps.tooltips.got_it_button'),
      [],
    );

    const primaryButtonDefault = useMemo(
      () => ({
        children: buttonLabel,
        onPress: handleGotItPress,
        size: ButtonSize.Lg,
        testID: PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON,
      }),
      [buttonLabel, handleGotItPress],
    );

    const primaryButtonProps = buttonConfigProps?.[0] ?? primaryButtonDefault;
    const secondaryButtonProps = buttonConfigProps?.[1];

    const hasCustomHeader =
      contentKey === 'market_hours' || contentKey === 'after_hours_trading';

    if (!isVisible || !title) return null;

    return (
      <BottomSheet ref={bottomSheetRef} onClose={onClose} testID={testID}>
        {!hasCustomHeader && (
          <BottomSheetHeader
            onClose={handleClose}
            testID={PerpsBottomSheetTooltipSelectorsIDs.TITLE}
          >
            {title}
          </BottomSheetHeader>
        )}
        <Box paddingHorizontal={4}>{renderContent()}</Box>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          primaryButtonProps={primaryButtonProps}
          secondaryButtonProps={secondaryButtonProps}
          twClassName="pt-6"
        />
      </BottomSheet>
    );
  },
);

export default PerpsBottomSheetTooltip;
