import React, { useCallback, useRef } from 'react';
import { Modal } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { MoneyDepositApySheetTestIds } from './money-apy-info-sheet.testIds';

interface MoneyDepositApySheetProps {
  open: boolean;
  onClose: () => void;
  apy?: number;
}

const ApySection = ({ title, body }: { title: string; body: string }) => (
  <Box twClassName="gap-1">
    <Text
      variant={TextVariant.HeadingSm}
      color={TextColor.TextDefault}
      accessibilityRole="header"
    >
      {title}
    </Text>
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {body}
    </Text>
  </Box>
);

export const MoneyDepositApySheet = ({
  open,
  onClose,
  apy,
}: MoneyDepositApySheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleRequestClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  if (!open) {
    return null;
  }

  const hasApy = typeof apy === 'number' && Number.isFinite(apy) && apy >= 0;

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <BottomSheet
        ref={sheetRef}
        onClose={onClose}
        testID={MoneyDepositApySheetTestIds.CONTAINER}
        keyboardAvoidingViewEnabled={false}
        twClassName="bg-section rounded-t-3xl"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          testID={MoneyDepositApySheetTestIds.SCROLL_VIEW}
        >
          <Box twClassName="px-4 pt-4 pb-4 gap-5">
            <Box twClassName="gap-1">
              {hasApy ? (
                <Text
                  variant={TextVariant.HeadingLg}
                  color={TextColor.SuccessDefault}
                  accessibilityRole="header"
                  testID={MoneyDepositApySheetTestIds.APY_TITLE}
                >
                  {strings('confirm.money_deposit.apy_label', {
                    percentage: apy,
                  })}
                </Text>
              ) : null}
              <Text
                variant={TextVariant.HeadingSm}
                color={TextColor.TextDefault}
                accessibilityRole="header"
              >
                {strings('confirm.money_deposit.apy_info_sheet.subtitle')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('confirm.money_deposit.apy_info_sheet.lead')}
              </Text>
            </Box>
            <ApySection
              title={strings(
                'confirm.money_deposit.apy_info_sheet.how_it_works_title',
              )}
              body={strings(
                'confirm.money_deposit.apy_info_sheet.how_it_works_body',
              )}
            />
            <ApySection
              title={strings(
                'confirm.money_deposit.apy_info_sheet.why_it_changes_title',
              )}
              body={strings(
                'confirm.money_deposit.apy_info_sheet.why_it_changes_body',
              )}
            />
            <ApySection
              title={strings(
                'confirm.money_deposit.apy_info_sheet.where_it_comes_from_title',
              )}
              body={strings(
                'confirm.money_deposit.apy_info_sheet.where_it_comes_from_body',
              )}
            />
          </Box>
        </ScrollView>
      </BottomSheet>
    </Modal>
  );
};
