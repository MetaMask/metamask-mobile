import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { LimitOrderCostToleranceInfoSheetSelectorsIDs } from './LimitOrderCostToleranceInfoSheet.testIds';
import type { LimitOrderCostToleranceInfoSheetProps } from './LimitOrderCostToleranceInfoSheet.types';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

const LimitOrderCostToleranceInfoSheet = ({
  goBack,
}: LimitOrderCostToleranceInfoSheetProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
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
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={closeSheet}
        closeButtonProps={{
          testID: LimitOrderCostToleranceInfoSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.cost_tolerance')}
      </BottomSheetHeaderGlass>
      <Box paddingHorizontal={4} paddingBottom={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={LimitOrderCostToleranceInfoSheetSelectorsIDs.BODY}
        >
          {strings('bridge.cost_tolerance_tooltip_content')}
        </Text>
      </Box>
    </BottomSheet>
  );
};

export default LimitOrderCostToleranceInfoSheet;
