import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { PredictOutcomeToken } from '../../types';
import { formatCents } from '../../utils/format';

export interface PredictBuyPreviewHeaderTitleProps {
  title: string;
  outcomeImage?: string;
  outcomeGroupTitle?: string;
  outcomeToken: PredictOutcomeToken;
  sharePrice?: number;
}

export function PredictBuyPreviewHeaderTitle({
  title,
  outcomeImage,
  outcomeGroupTitle,
  outcomeToken,
  sharePrice,
}: PredictBuyPreviewHeaderTitleProps) {
  const tw = useTailwind();
  const separator = '·';
  const outcomeTokenLabel = `${outcomeToken?.title} at ${formatCents(
    sharePrice ?? outcomeToken?.price ?? 0,
  )}`;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
    >
      <Image
        source={{ uri: outcomeImage }}
        style={tw.style('w-10 h-10 rounded')}
      />
      <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 min-w-0">
        <Text
          variant={TextVariant.HeadingSm}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-1">
          {!!outcomeGroupTitle && (
            <>
              <Text
                variant={TextVariant.BodySm}
                twClassName="font-medium"
                color={TextColor.TextAlternative}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {outcomeGroupTitle}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                twClassName="font-medium"
                color={TextColor.TextAlternative}
              >
                {separator}
              </Text>
            </>
          )}
          <Text
            variant={TextVariant.BodySm}
            twClassName="font-medium"
            color={
              outcomeToken?.title === 'Yes'
                ? TextColor.SuccessDefault
                : TextColor.ErrorDefault
            }
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {outcomeTokenLabel}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

export function PredictBuyPreviewHeaderBack({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <TouchableOpacity testID="back-button" onPress={onBack}>
      <Icon name={IconName.ArrowLeft} size={IconSize.Md} />
    </TouchableOpacity>
  );
}

interface PredictBuyPreviewHeaderProps
  extends PredictBuyPreviewHeaderTitleProps {
  onBack: () => void;
}

const PredictBuyPreviewHeader = ({
  onBack,
  ...titleProps
}: PredictBuyPreviewHeaderProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="w-full gap-4 p-4"
  >
    <PredictBuyPreviewHeaderBack onBack={onBack} />
    <PredictBuyPreviewHeaderTitle {...titleProps} />
  </Box>
);

export default PredictBuyPreviewHeader;
