import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  ButtonsAlignment,
  FontWeight,
  ListItemMultiSelect,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsCrossMarginConfirmBottomSheetSelectorsIDs } from '../../Perps.testIds';
import type { PerpsCrossMarginConfirmBottomSheetProps } from './PerpsCrossMarginConfirmBottomSheet.types';

const ACKNOWLEDGEMENT_ITEMS = [
  {
    key: 'collateral',
    testID: PerpsCrossMarginConfirmBottomSheetSelectorsIDs.COLLATERAL_ITEM,
    title: 'perps.cross_margin_confirm.collateral_title',
    description: 'perps.cross_margin_confirm.collateral_description',
  },
  {
    key: 'liquidation',
    testID: PerpsCrossMarginConfirmBottomSheetSelectorsIDs.LIQUIDATION_ITEM,
    title: 'perps.cross_margin_confirm.liquidation_title',
    description: 'perps.cross_margin_confirm.liquidation_description',
  },
  {
    key: 'margin',
    testID: PerpsCrossMarginConfirmBottomSheetSelectorsIDs.MARGIN_ITEM,
    title: 'perps.cross_margin_confirm.margin_title',
    description: 'perps.cross_margin_confirm.margin_description',
  },
] as const;

type AcknowledgementKey = (typeof ACKNOWLEDGEMENT_ITEMS)[number]['key'];

const INITIAL_ACKNOWLEDGEMENTS: Record<AcknowledgementKey, boolean> = {
  collateral: false,
  liquidation: false,
  margin: false,
};

/**
 * Confirmation sheet shown the first time a user selects cross margin.
 * The user must acknowledge every risk item before "Confirm" is enabled.
 */
const PerpsCrossMarginConfirmBottomSheet: React.FC<
  PerpsCrossMarginConfirmBottomSheetProps
> = ({ isVisible = true, onClose, onConfirm, sheetRef: externalSheetRef }) => {
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef ?? internalSheetRef;
  const closeIntentRef = useRef<'dismiss' | 'confirm'>('dismiss');
  // Hiding unmounts BottomSheet before its close animation can finish, so a
  // confirm intent must not leak into the next opening, and a late confirm
  // animation must not call onClose after that opening has started.
  // The id changes during render so the committed sheet already belongs to
  // the new opening. Updating it in an effect would leave the first paint
  // with a dismiss handler that no-ops.
  const [openingId, setOpeningId] = useState(0);
  const [prevVisible, setPrevVisible] = useState(isVisible);
  const openingIdRef = useRef(openingId);
  const [acknowledged, setAcknowledged] = useState(INITIAL_ACKNOWLEDGEMENTS);

  if (isVisible !== prevVisible) {
    setPrevVisible(isVisible);
    if (isVisible) {
      closeIntentRef.current = 'dismiss';
      setOpeningId((current) => current + 1);
    }
  }
  openingIdRef.current = openingId;

  const resetAcknowledgements = useCallback(() => {
    setAcknowledged(INITIAL_ACKNOWLEDGEMENTS);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      // The sheet can stay mounted and return null. Clear here so the next
      // open cannot skip the risk gate when the close animation never runs.
      resetAcknowledgements();
      return;
    }

    if (!externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef, resetAcknowledgements]);

  const handleDismissed = useCallback(() => {
    if (openingId !== openingIdRef.current) {
      return;
    }

    const confirmed = closeIntentRef.current === 'confirm';
    closeIntentRef.current = 'dismiss';
    resetAcknowledgements();
    // Confirm closes the sheet too, but onClose means the user cancelled.
    if (!confirmed) {
      onClose();
    }
  }, [onClose, openingId, resetAcknowledgements]);

  const handleClose = useCallback(() => {
    closeIntentRef.current = 'dismiss';
    resetAcknowledgements();
    sheetRef.current?.onCloseBottomSheet();
  }, [sheetRef, resetAcknowledgements]);

  const handleConfirm = useCallback(() => {
    closeIntentRef.current = 'confirm';
    onConfirm();
    resetAcknowledgements();
    sheetRef.current?.onCloseBottomSheet();
  }, [onConfirm, resetAcknowledgements, sheetRef]);

  const toggleItem = useCallback((key: AcknowledgementKey) => {
    setAcknowledged((previous) => ({ ...previous, [key]: !previous[key] }));
  }, []);

  if (!isVisible) {
    return null;
  }

  const allAcknowledged = ACKNOWLEDGEMENT_ITEMS.every(
    ({ key }) => acknowledged[key],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      testID={PerpsCrossMarginConfirmBottomSheetSelectorsIDs.CONTAINER}
      goBack={!externalSheetRef ? handleDismissed : undefined}
      onClose={externalSheetRef ? handleDismissed : undefined}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: PerpsCrossMarginConfirmBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('perps.cross_margin_confirm.title')}
      </BottomSheetHeader>
      <Box twClassName="px-4 pb-3 gap-4" accessible={false}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('perps.cross_margin_confirm.description')}
        </Text>
        <Box twClassName="gap-2" accessible={false}>
          {ACKNOWLEDGEMENT_ITEMS.map(({ key, testID, title, description }) => (
            <ListItemMultiSelect
              key={key}
              testID={testID}
              title={strings(title)}
              description={strings(description)}
              descriptionProps={{ fontWeight: FontWeight.Regular }}
              isSelected={acknowledged[key]}
              onPress={() => toggleItem(key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acknowledged[key] }}
              accessoryGap={4}
              twClassName={`bg-muted rounded-2xl py-4 border ${
                acknowledged[key] ? 'border-default' : 'border-transparent'
              }`}
            />
          ))}
        </Box>
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        secondaryButtonProps={{
          children: strings('perps.cross_margin_confirm.go_back'),
          onPress: handleClose,
          size: ButtonSize.Lg,
          testID: PerpsCrossMarginConfirmBottomSheetSelectorsIDs.GO_BACK_BUTTON,
        }}
        primaryButtonProps={{
          children: strings('perps.cross_margin_confirm.confirm'),
          onPress: handleConfirm,
          size: ButtonSize.Lg,
          isDisabled: !allAcknowledged,
          testID: PerpsCrossMarginConfirmBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

PerpsCrossMarginConfirmBottomSheet.displayName =
  'PerpsCrossMarginConfirmBottomSheet';

export default PerpsCrossMarginConfirmBottomSheet;
