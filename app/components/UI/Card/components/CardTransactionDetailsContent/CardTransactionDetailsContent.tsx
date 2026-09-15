import React from 'react';
import { ScrollView } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  IconName,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  type ImageOrSvgSrc,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { ButtonIconSizes } from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconColor } from '../../../../../component-library/components/Icons/Icon';
import { TransactionDetailDivider } from '../../../../Views/confirmations/components/activity/transaction-detail-divider/transaction-detail-divider';
import { TransactionDetailsRow } from '../../../../Views/confirmations/components/activity/transaction-details-row/transaction-details-row';
import CopyButton from '../../../../Views/confirmations/components/UI/copy-button/copy-button';
import { strings } from '../../../../../../locales/i18n';
import MoneyBalanceIcon from '../../../../../images/money-balance.svg';
import type { CardTransactionHeroToken } from '../../utils/getCardTransactionHeroToken';

export interface CardTransactionDetailsContentProps {
  heroCopy: string;
  primaryAmount: string;
  fiatAmount?: string;
  amountColor?: TextColor;
  statusLabel: string;
  statusColor?: TextColor;
  dateLabel: string;
  merchantName?: string;
  categoryLabel?: string;
  locationLabel?: string;
  declineReason?: string;
  transactionId?: string;
  heroToken: CardTransactionHeroToken;
  heroIconTestID?: string;
  onBack: () => void;
  onReportPress?: () => void;
  onViewOnExplorer?: () => void;
  footer?: React.ReactNode;
}

const CardTransactionDetailsContent = ({
  heroCopy,
  primaryAmount,
  fiatAmount,
  amountColor = TextColor.TextDefault,
  statusLabel,
  statusColor = TextColor.SuccessDefault,
  dateLabel,
  merchantName,
  categoryLabel,
  locationLabel,
  declineReason,
  transactionId,
  heroToken,
  heroIconTestID = 'card-transaction-details-asset-icon',
  onBack,
  onReportPress,
  onViewOnExplorer,
  footer,
}: CardTransactionDetailsContentProps) => {
  const tw = useTailwind();

  return (
    <Box twClassName="flex-1 bg-background-default">
      <HeaderStandard
        title={strings('card.transactions.details_title')}
        onBack={onBack}
        backButtonProps={{ testID: 'card-transaction-details-back-button' }}
        includesTopInset
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-8')}
      >
        <Box twClassName="px-4">
          <Box twClassName="gap-3">
            <Box twClassName="gap-1">
              <Text color={TextColor.TextAlternative}>{heroCopy}</Text>
              <Box twClassName="flex-row items-center gap-3">
                {heroToken.isMoneyAccount ? (
                  <MoneyBalanceIcon
                    width={32}
                    height={32}
                    name="money-balance"
                    testID={heroIconTestID}
                  />
                ) : (
                  <AvatarToken
                    name={heroToken.symbol}
                    src={heroToken.iconSource as ImageOrSvgSrc}
                    size={AvatarTokenSize.Md}
                    testID={heroIconTestID}
                  />
                )}
                <Text variant={TextVariant.DisplayMd} color={amountColor}>
                  {primaryAmount}
                </Text>
              </Box>
              {fiatAmount ? (
                <Text color={TextColor.TextAlternative}>{fiatAmount}</Text>
              ) : null}
            </Box>

            <TransactionDetailDivider />

            <TransactionDetailsRow label={strings('transactions.status')}>
              <Text color={statusColor}>{statusLabel}</Text>
            </TransactionDetailsRow>

            <TransactionDetailsRow
              label={strings('money.api_activity_details.date')}
            >
              <Text>{dateLabel}</Text>
            </TransactionDetailsRow>

            {merchantName ? (
              <TransactionDetailsRow
                label={strings('card.transactions.merchant')}
              >
                <Text>{merchantName}</Text>
              </TransactionDetailsRow>
            ) : null}

            {categoryLabel ? (
              <TransactionDetailsRow
                label={strings('card.transactions.category')}
              >
                <Text>{categoryLabel}</Text>
              </TransactionDetailsRow>
            ) : null}

            {locationLabel ? (
              <TransactionDetailsRow
                label={strings('card.transactions.location')}
              >
                <Text>{locationLabel}</Text>
              </TransactionDetailsRow>
            ) : null}

            {transactionId ? (
              <TransactionDetailsRow
                label={strings('transaction.transaction_id')}
              >
                <Box twClassName="flex-row items-center gap-1.5">
                  <Text color={TextColor.TextAlternative}>{transactionId}</Text>
                  <CopyButton
                    copyText={transactionId}
                    size={ButtonIconSizes.Sm}
                    iconColor={IconColor.Alternative}
                    testID="card-transaction-details-copy-id"
                  />
                </Box>
              </TransactionDetailsRow>
            ) : null}

            {declineReason ? (
              <Box twClassName="gap-1">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  {strings('card.transactions.decline_reason')}
                </Text>
                <Text color={TextColor.TextAlternative}>{declineReason}</Text>
              </Box>
            ) : null}

            {footer}

            {onViewOnExplorer ? (
              <Box twClassName="w-full pt-2">
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  onPress={onViewOnExplorer}
                  startIconName={IconName.Export}
                  testID="card-transaction-details-explorer-button"
                >
                  {strings('card.transactions.view_on_explorer')}
                </Button>
              </Box>
            ) : null}

            {onReportPress ? (
              <Box twClassName="w-full items-center pt-2">
                <TextButton
                  onPress={onReportPress}
                  testID="card-transaction-details-report-button"
                >
                  {strings('card.transactions.report_cta')}
                </TextButton>
              </Box>
            ) : null}
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
};

export default CardTransactionDetailsContent;
