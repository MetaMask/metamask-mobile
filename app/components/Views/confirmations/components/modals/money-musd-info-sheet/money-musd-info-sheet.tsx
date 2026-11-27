import React, { useCallback, useRef } from 'react';
import { Modal } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  Box,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import useMoneyVaultApy from '../../../../../UI/Money/hooks/useMoneyVaultApy';
import { MoneyMusdInfoSheetTestIds } from './money-musd-info-sheet.testIds';

interface MoneyMusdInfoSheetProps {
  open: boolean;
  onClose: () => void;
  receiveAmountFiat: string;
}

const CheckBulletRow = ({
  title,
  body,
  testID,
}: {
  title: React.ReactNode;
  body: string;
  testID: string;
}) => (
  <Box flexDirection={BoxFlexDirection.Row} className="gap-4" testID={testID}>
    <Icon
      name={IconName.Check}
      size={IconSize.Md}
      color={IconColor.SuccessDefault}
    />
    <Box className="flex-1 gap-1">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {title}
      </Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {body}
      </Text>
    </Box>
  </Box>
);

export const MoneyMusdInfoSheet = ({
  open,
  onClose,
  receiveAmountFiat,
}: MoneyMusdInfoSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { apyPercent } = useMoneyVaultApy({ enabled: open });

  const handleRequestClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  if (!open) {
    return null;
  }

  const hasApy =
    typeof apyPercent === 'number' &&
    Number.isFinite(apyPercent) &&
    apyPercent >= 0;

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
        testID={MoneyMusdInfoSheetTestIds.CONTAINER}
        keyboardAvoidingViewEnabled={false}
        twClassName="rounded-t-3xl bg-section"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          testID={MoneyMusdInfoSheetTestIds.SCROLL_VIEW}
        >
          <Box className="gap-6 p-4">
            <Box className="gap-2">
              <Text
                variant={TextVariant.HeadingLg}
                color={TextColor.TextDefault}
                accessibilityRole="header"
                testID={MoneyMusdInfoSheetTestIds.TITLE}
              >
                {strings('confirm.money_deposit.musd_info_sheet.title', {
                  amount: receiveAmountFiat,
                })}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                testID={MoneyMusdInfoSheetTestIds.LEAD}
              >
                {strings('confirm.money_deposit.musd_info_sheet.lead')}
              </Text>
            </Box>
            <Box className="gap-5">
              <CheckBulletRow
                title={strings(
                  'confirm.money_deposit.musd_info_sheet.bullet_worth_title',
                )}
                body={strings(
                  'confirm.money_deposit.musd_info_sheet.bullet_worth_body',
                )}
                testID={MoneyMusdInfoSheetTestIds.BULLET_WORTH}
              />
              <CheckBulletRow
                title={strings(
                  'confirm.money_deposit.musd_info_sheet.bullet_backed_title',
                )}
                body={strings(
                  'confirm.money_deposit.musd_info_sheet.bullet_backed_body',
                )}
                testID={MoneyMusdInfoSheetTestIds.BULLET_BACKED}
              />
              {hasApy ? (
                <CheckBulletRow
                  title={
                    <>
                      {strings(
                        'confirm.money_deposit.musd_info_sheet.bullet_earns_title_prefix',
                      )}
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Medium}
                        color={TextColor.SuccessDefault}
                      >
                        {strings('confirm.money_deposit.apy_label', {
                          percentage: apyPercent,
                        })}
                      </Text>
                    </>
                  }
                  body={strings(
                    'confirm.money_deposit.musd_info_sheet.bullet_earns_body',
                  )}
                  testID={MoneyMusdInfoSheetTestIds.BULLET_EARNS}
                />
              ) : null}
              <CheckBulletRow
                title={strings(
                  'confirm.money_deposit.musd_info_sheet.bullet_no_lockups_title',
                )}
                body={strings(
                  'confirm.money_deposit.musd_info_sheet.bullet_no_lockups_body',
                )}
                testID={MoneyMusdInfoSheetTestIds.BULLET_NO_LOCKUPS}
              />
            </Box>
          </Box>
        </ScrollView>
      </BottomSheet>
    </Modal>
  );
};
