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
  const [acknowledged, setAcknowledged] = useState(INITIAL_ACKNOWLEDGEMENTS);

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, [sheetRef]);

  const handleConfirm = useCallback(() => {
    onConfirm();
    handleClose();
  }, [onConfirm, handleClose]);

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
      goBack={!externalSheetRef ? onClose : undefined}
      onClose={externalSheetRef ? onClose : undefined}
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
