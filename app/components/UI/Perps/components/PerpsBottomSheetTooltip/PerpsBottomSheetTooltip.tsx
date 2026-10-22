/* eslint-disable jsdoc/check-indentation */
import React, { useRef, useCallback, useMemo, useState } from 'react';
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
import {
  PerpsBottomSheetTooltipProps,
  PerpsTooltipContentKey,
} from './PerpsBottomSheetTooltip.types';
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
    // Content opened from inside this tooltip, e.g. the Orange fees
    // explainer from the fees breakdown. "Got it" returns to `contentKey`.
    const [nestedContentKey, setNestedContentKey] =
      useState<PerpsTooltipContentKey>();
    const activeContentKey = nestedContentKey ?? contentKey;

    const title = useMemo(
      () => strings(`perps.tooltips.${activeContentKey}.title`),
      [activeContentKey],
    );

    const renderContent = () => {
      const CustomRenderer = tooltipContentRegistry[activeContentKey];

      if (CustomRenderer) {
        return (
          <CustomRenderer
            testID={PerpsBottomSheetTooltipSelectorsIDs.CONTENT}
            data={data}
            onOpenNestedInfo={
              nestedContentKey ? undefined : setNestedContentKey
            }
          />
        );
      }

      return (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={PerpsBottomSheetTooltipSelectorsIDs.CONTENT}
        >
          {strings(`perps.tooltips.${activeContentKey}.content`)}
        </Text>
      );
    };

    const { track } = usePerpsEventTracking();

    const handleClose = useCallback(() => {
      bottomSheetRef.current?.onCloseBottomSheet();
    }, []);

    const handleSheetClose = useCallback(() => {
      setNestedContentKey(undefined);
      onClose();
    }, [onClose]);

    const handleGotItPress = useCallback(() => {
      if (nestedContentKey) {
        setNestedContentKey(undefined);
        return;
      }
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.TOOLTIP,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          buttonLocation ?? PERPS_EVENT_VALUE.BUTTON_LOCATION.TOOLTIP,
      });
      handleClose();
    }, [track, handleClose, buttonLocation, nestedContentKey]);

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

    // Nested content always gets the default "Got it", which returns.
    const primaryButtonProps =
      (nestedContentKey ? undefined : buttonConfigProps?.[0]) ??
      primaryButtonDefault;
    const secondaryButtonProps = nestedContentKey
      ? undefined
      : buttonConfigProps?.[1];

    const hasCustomHeader =
      activeContentKey === 'market_hours' ||
      activeContentKey === 'after_hours_trading';

    if (!isVisible || !title) return null;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        onClose={handleSheetClose}
        testID={testID}
      >
        {!hasCustomHeader && (
          <BottomSheetHeader
            onBack={
              nestedContentKey
                ? () => setNestedContentKey(undefined)
                : undefined
            }
            backButtonProps={{
              accessibilityLabel: strings('navigation.back'),
              testID: PerpsBottomSheetTooltipSelectorsIDs.BACK_BUTTON,
            }}
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
