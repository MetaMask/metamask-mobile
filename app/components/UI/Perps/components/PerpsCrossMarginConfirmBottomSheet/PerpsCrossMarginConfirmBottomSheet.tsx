import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  ButtonsAlignment,
  Checkbox,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsCrossMarginConfirmBottomSheetProps } from './PerpsCrossMarginConfirmBottomSheet.types';
import { PerpsCrossMarginConfirmBottomSheetSelectorsIDs } from './PerpsCrossMarginConfirmBottomSheet.testIds';

type AcknowledgementKey = 'collateral' | 'liquidation' | 'margin';

interface AcknowledgementItemProps {
  title: string;
  message: string;
  isSelected: boolean;
  onToggle: () => void;
  testID: string;
}

const AcknowledgementItem: React.FC<AcknowledgementItemProps> = ({
  title,
  message,
  isSelected,
  onToggle,
  testID,
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${title}. ${message}`}
      onPress={onToggle}
      style={({ pressed }) =>
        tw.style(
          'flex-row items-start gap-4 rounded-2xl bg-muted p-4',
          pressed && 'bg-pressed',
        )
      }
    >
      <Box twClassName="flex-1 gap-0">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {message}
        </Text>
      </Box>
      <Checkbox
        isSelected={isSelected}
        onChange={onToggle}
        accessible={false}
      />
    </Pressable>
  );
};

const PerpsCrossMarginConfirmBottomSheet: React.FC<
  PerpsCrossMarginConfirmBottomSheetProps
> = ({ onConfirm, onClose }) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [acknowledged, setAcknowledged] = useState<
    Record<AcknowledgementKey, boolean>
  >({
    collateral: false,
    liquidation: false,
    margin: false,
  });

  const allAcknowledged =
    acknowledged.collateral && acknowledged.liquidation && acknowledged.margin;

  const toggle = useCallback((key: AcknowledgementKey) => {
    setAcknowledged((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (allAcknowledged) {
      onConfirm();
    }
  }, [allAcknowledged, onConfirm]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.crossMarginConfirm.confirm'),
      onPress: handleConfirm,
      isDisabled: !allAcknowledged,
      size: ButtonSize.Lg,
      testID: PerpsCrossMarginConfirmBottomSheetSelectorsIDs.CONFIRM_BUTTON,
    }),
    [allAcknowledged, handleConfirm],
  );

  const secondaryButtonProps = useMemo(
    () => ({
      children: strings('perps.crossMarginConfirm.go_back'),
      onPress: onClose,
      size: ButtonSize.Lg,
      testID: PerpsCrossMarginConfirmBottomSheetSelectorsIDs.GO_BACK_BUTTON,
    }),
    [onClose],
  );

  return (
    <BottomSheet ref={sheetRef} onClose={onClose}>
      <BottomSheetHeader
        onClose={onClose}
        closeButtonProps={{
          testID: PerpsCrossMarginConfirmBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('perps.crossMarginConfirm.title')}
      </BottomSheetHeader>
      <Box
        twClassName="px-4 py-4 gap-4"
        testID={PerpsCrossMarginConfirmBottomSheetSelectorsIDs.CONTAINER}
      >
        <Box twClassName="gap-2">
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('perps.crossMarginConfirm.selected_description')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('perps.crossMarginConfirm.checklist_prompt')}
          </Text>
        </Box>
        <Box twClassName="gap-2">
          <AcknowledgementItem
            title={strings('perps.crossMarginConfirm.collateral_title')}
            message={strings('perps.crossMarginConfirm.collateral_message')}
            isSelected={acknowledged.collateral}
            onToggle={() => toggle('collateral')}
            testID={
              PerpsCrossMarginConfirmBottomSheetSelectorsIDs.COLLATERAL_ITEM
            }
          />
          <AcknowledgementItem
            title={strings('perps.crossMarginConfirm.liquidation_title')}
            message={strings('perps.crossMarginConfirm.liquidation_message')}
            isSelected={acknowledged.liquidation}
            onToggle={() => toggle('liquidation')}
            testID={
              PerpsCrossMarginConfirmBottomSheetSelectorsIDs.LIQUIDATION_ITEM
            }
          />
          <AcknowledgementItem
            title={strings('perps.crossMarginConfirm.margin_title')}
            message={strings('perps.crossMarginConfirm.margin_message')}
            isSelected={acknowledged.margin}
            onToggle={() => toggle('margin')}
            testID={PerpsCrossMarginConfirmBottomSheetSelectorsIDs.MARGIN_ITEM}
          />
        </Box>
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        primaryButtonProps={primaryButtonProps}
        secondaryButtonProps={secondaryButtonProps}
      />
    </BottomSheet>
  );
};

export default PerpsCrossMarginConfirmBottomSheet;
