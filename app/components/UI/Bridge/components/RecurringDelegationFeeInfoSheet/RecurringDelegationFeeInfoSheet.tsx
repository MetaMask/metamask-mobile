import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { RecurringDelegationFeeInfoSheetSelectorsIDs } from './RecurringDelegationFeeInfoSheet.testIds';
import type { RecurringDelegationFeeInfoSheetProps } from './RecurringDelegationFeeInfoSheet.types';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

const RecurringDelegationFeeInfoSheet = ({
  goBack,
}: RecurringDelegationFeeInfoSheetProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={RecurringDelegationFeeInfoSheetSelectorsIDs.SHEET}
      goBack={goBack}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={closeSheet}
        closeButtonProps={{
          testID: RecurringDelegationFeeInfoSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.recurring.account_upgrade_fee_info_title')}
      </BottomSheetHeaderGlass>
      <Box paddingHorizontal={4} paddingBottom={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={RecurringDelegationFeeInfoSheetSelectorsIDs.BODY}
        >
          {strings('bridge.recurring.account_upgrade_fee_info_body')}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('bridge.recurring.got_it'),
          onPress: closeSheet,
          testID: RecurringDelegationFeeInfoSheetSelectorsIDs.GOT_IT_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default RecurringDelegationFeeInfoSheet;
