import React from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { BigNumber } from 'bignumber.js';
import { useStyles } from '../../../../../component-library/hooks';
import customAmountStyleSheet from '../../../../Views/confirmations/components/transactions/custom-amount/custom-amount.styles';
import {
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import MoneyIcon from '../../../../../images/money.png';
import InfoRow from '../../../../Views/confirmations/components/UI/info-row';
import { InfoRowVariant } from '../../../../Views/confirmations/components/UI/info-row/info-row';
import { moneyFormatUsd } from '../../../../UI/Money/utils/moneyFormatFiat';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { ConfirmMembershipApprovalTestIds } from '../../ConfirmMembershipApproval.testIds';

export interface ConfirmMembershipContentProps {
  monthlyAmount: string;
  totalAmount: string;
  renewDate: string;
  isTrial?: boolean;
  billedOn?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmMembershipContent({
  monthlyAmount,
  totalAmount,
  renewDate,
  isTrial = false,
  billedOn = '',
  onClose,
  onConfirm,
}: ConfirmMembershipContentProps) {
  return (
    <Box testID={ConfirmMembershipApprovalTestIds.CONTAINER}>
      <Header onClose={onClose} />
      <Box twClassName="px-4 gap-4">
        <AmountSection monthlyAmount={monthlyAmount} />
        <Box>
          <MoneyAccountFromRow />
          <TotalRow totalAmount={totalAmount} />
          <BilledOnRow isTrial={isTrial} billedOn={billedOn} />
        </Box>
        <ConfirmButton isTrial={isTrial} onPress={onConfirm} />
        <Disclaimer
          isTrial={isTrial}
          monthlyAmount={monthlyAmount}
          renewDate={renewDate}
        />
      </Box>
    </Box>
  );
}

function getConfirmButtonLabel(isTrial: boolean) {
  return isTrial
    ? strings('confirm_membership.start_trial')
    : strings('confirm_membership.confirm_and_pay');
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheetHeader
      onClose={onClose}
      closeButtonProps={{
        testID: ConfirmMembershipApprovalTestIds.CLOSE_BUTTON,
      }}
    >
      <Text variant={TextVariant.HeadingSm}>
        {strings('confirm_membership.title')}
      </Text>
    </BottomSheetHeader>
  );
}

function AmountSection({ monthlyAmount }: { monthlyAmount: string }) {
  const formattedAmount = moneyFormatUsd(new BigNumber(monthlyAmount || '0'));
  const { styles: amountStyles } = useStyles(customAmountStyleSheet, {
    amountLength: formattedAmount.length,
    hasAlert: false,
    disabled: false,
  });

  return (
    <Box twClassName="items-center gap-1 pt-10 pb-12">
      <View style={amountStyles.container}>
        <Text
          testID={ConfirmMembershipApprovalTestIds.AMOUNT}
          style={amountStyles.input}
        >
          {formattedAmount}
        </Text>
      </View>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={ConfirmMembershipApprovalTestIds.PLAN_NAME}
      >
        {strings('confirm_membership.plan_name')}
      </Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  moneyIcon: { width: 20, height: 20 },
});

function MoneyAccountFromRow() {
  const { totalFiatFormatted } = useMoneyAccountBalance();

  return (
    <InfoRow
      label={strings('confirm.label.from')}
      rowVariant={InfoRowVariant.Small}
      testID={ConfirmMembershipApprovalTestIds.FROM_ROW}
    >
      <Box twClassName="flex-row items-center gap-2">
        <Image source={MoneyIcon} style={styles.moneyIcon} />
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {strings('confirm.pay_with_bottom_sheet.money_account')}
          {totalFiatFormatted && (
            <Text color={TextColor.TextAlternative}>
              {` (${totalFiatFormatted})`}
            </Text>
          )}
        </Text>
      </Box>
    </InfoRow>
  );
}

function TotalRow({ totalAmount }: { totalAmount: string }) {
  const totalFormatted = moneyFormatUsd(new BigNumber(totalAmount || '0'));

  return (
    <InfoRow
      label={strings('confirm.label.total')}
      rowVariant={InfoRowVariant.Small}
      testID={ConfirmMembershipApprovalTestIds.TOTAL_ROW}
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
        {totalFormatted}
      </Text>
    </InfoRow>
  );
}

function BilledOnRow({
  isTrial,
  billedOn,
}: {
  isTrial: boolean;
  billedOn: string;
}) {
  if (!isTrial) {
    return null;
  }

  return (
    <InfoRow
      label={strings('confirm_membership.billed_on')}
      rowVariant={InfoRowVariant.Small}
      testID={ConfirmMembershipApprovalTestIds.BILLED_ON_ROW}
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
        {billedOn}
      </Text>
    </InfoRow>
  );
}

function ConfirmButton({
  isTrial,
  onPress,
}: {
  isTrial: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      endIconName={IconName.Lock}
      onPress={onPress}
      isFullWidth
      testID={ConfirmMembershipApprovalTestIds.CONFIRM_BUTTON}
    >
      {getConfirmButtonLabel(isTrial)}
    </Button>
  );
}

function Disclaimer({
  isTrial,
  monthlyAmount,
  renewDate,
}: {
  isTrial: boolean;
  monthlyAmount: string;
  renewDate: string;
}) {
  return (
    <Text
      variant={TextVariant.BodyXs}
      color={TextColor.TextAlternative}
      twClassName="text-center"
      testID={ConfirmMembershipApprovalTestIds.DISCLAIMER}
    >
      {strings('confirm_membership.disclaimer.part1', {
        confirmAndPay: getConfirmButtonLabel(isTrial),
        monthlyAmount: moneyFormatUsd(new BigNumber(monthlyAmount || '0')),
        renewDate,
      })}
      <TextButton
        variant={TextVariant.BodyXs}
        onPress={() => Linking.openURL(AppConstants.URLS.TERMS_OF_USE)}
      >
        {strings('confirm_membership.disclaimer.terms_of_use')}
      </TextButton>
      {strings('confirm_membership.disclaimer.part2')}
      <TextButton
        variant={TextVariant.BodyXs}
        onPress={() => Linking.openURL(AppConstants.URLS.PRIVACY_POLICY)}
      >
        {strings('confirm_membership.disclaimer.privacy_policy')}
      </TextButton>
      {strings('confirm_membership.disclaimer.part3')}
    </Text>
  );
}
