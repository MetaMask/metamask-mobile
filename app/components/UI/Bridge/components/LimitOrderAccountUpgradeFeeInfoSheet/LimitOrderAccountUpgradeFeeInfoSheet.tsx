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
import { LimitOrderAccountUpgradeFeeInfoSheetSelectorsIDs } from './LimitOrderAccountUpgradeFeeInfoSheet.testIds';
import type { LimitOrderAccountUpgradeFeeInfoSheetProps } from './LimitOrderAccountUpgradeFeeInfoSheet.types';

const LimitOrderAccountUpgradeFeeInfoSheet = ({
  goBack,
}: LimitOrderAccountUpgradeFeeInfoSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={LimitOrderAccountUpgradeFeeInfoSheetSelectorsIDs.SHEET}
      goBack={goBack}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: LimitOrderAccountUpgradeFeeInfoSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.limit.account_upgrade_fee_info_title')}
      </BottomSheetHeader>
      <Box paddingHorizontal={4} paddingBottom={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={LimitOrderAccountUpgradeFeeInfoSheetSelectorsIDs.BODY}
        >
          {strings('bridge.limit.account_upgrade_fee_info_body')}
        </Text>
      </Box>
    </BottomSheet>
  );
};

export default LimitOrderAccountUpgradeFeeInfoSheet;
