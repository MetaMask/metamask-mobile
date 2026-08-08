import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxJustifyContent,
  IconColor,
  IconName,
  IconSize,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';

import {
  getTransactionStatusPresentation,
  TransactionStatusTone,
} from './transactionStatus';

export interface WalletAssistantTransactionStatusCardProps {
  historyItem: BridgeHistoryItem;
  testID?: string;
}

const StatusIndicator = ({ tone }: { tone: TransactionStatusTone }) => {
  if (tone === TransactionStatusTone.Pending) {
    return (
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        backgroundColor={BoxBackgroundColor.PrimaryMuted}
        twClassName="h-8 w-8 rounded-full"
      >
        <Spinner
          color={IconColor.PrimaryDefault}
          spinnerIconProps={{ size: IconSize.Md }}
        />
      </Box>
    );
  }

  const isSuccess = tone === TransactionStatusTone.Success;

  return (
    <AvatarIcon
      iconName={isSuccess ? IconName.CheckBold : IconName.Error}
      severity={
        isSuccess ? AvatarIconSeverity.Success : AvatarIconSeverity.Danger
      }
      size={AvatarIconSize.Md}
    />
  );
};

const getTitleColor = (tone: TransactionStatusTone): TextColor => {
  if (tone === TransactionStatusTone.Success) {
    return TextColor.SuccessDefault;
  }

  if (tone === TransactionStatusTone.Danger) {
    return TextColor.ErrorDefault;
  }

  return TextColor.TextDefault;
};

export const WalletAssistantTransactionStatusCard = ({
  historyItem,
  testID = 'wallet-assistant-transaction-status-card',
}: WalletAssistantTransactionStatusCardProps) => {
  const presentation = getTransactionStatusPresentation(
    historyItem.status.status,
  );
  const sourceSymbol = historyItem.quote.srcAsset.symbol;
  const destinationSymbol = historyItem.quote.destAsset.symbol;
  const tokenPair = `${sourceSymbol} to ${destinationSymbol}`;

  return (
    <Box
      accessible
      accessibilityLabel={`${presentation.title}. ${tokenPair}. ${presentation.description}`}
      accessibilityLiveRegion="polite"
      backgroundColor={BoxBackgroundColor.BackgroundMuted}
      testID={testID}
      twClassName="w-full gap-3 rounded-2xl p-4"
    >
      <Box twClassName="flex-row items-center gap-3">
        <StatusIndicator tone={presentation.tone} />
        <Text
          variant={TextVariant.HeadingSm}
          color={getTitleColor(presentation.tone)}
        >
          {presentation.title}
        </Text>
      </Box>

      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        accessibilityLabel={`${sourceSymbol} to ${destinationSymbol}`}
      >
        {sourceSymbol} → {destinationSymbol}
      </Text>

      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {presentation.description}
      </Text>
    </Box>
  );
};
