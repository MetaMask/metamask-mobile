import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { LimitOrderCostToleranceInfoSheetSelectorsIDs } from './LimitOrderCostToleranceInfoSheet.testIds';
import type { LimitOrderCostToleranceInfoSheetProps } from './LimitOrderCostToleranceInfoSheet.types';

const LimitOrderCostToleranceInfoSheet = ({
  minReceivedPercentage,
  goBack,
}: LimitOrderCostToleranceInfoSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={LimitOrderCostToleranceInfoSheetSelectorsIDs.SHEET}
      goBack={goBack}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: LimitOrderCostToleranceInfoSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.cost_tolerance')}
      </BottomSheetHeader>
      <Box paddingHorizontal={4} paddingBottom={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={LimitOrderCostToleranceInfoSheetSelectorsIDs.BODY}
        >
          {strings('bridge.cost_tolerance_tooltip_content', {
            minReceivedPercentage,
          })}
        </Text>
      </Box>
    </BottomSheet>
  );
};

export default LimitOrderCostToleranceInfoSheet;
