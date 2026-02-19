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

interface PredictBuyPreviewHeaderProps {
  title: string;
  outcomeImage?: string;
  outcomeGroupTitle?: string;
  outcomeToken: PredictOutcomeToken;
  sharePrice?: number;
  onBack: () => void;
}

const PredictBuyPreviewHeader = ({
  title,
  outcomeImage,
  outcomeGroupTitle,
  outcomeToken,
  sharePrice,
  onBack,
}: PredictBuyPreviewHeaderProps) => {
  const tw = useTailwind();
  const separator = '·';
  const outcomeTokenLabel = `${outcomeToken?.title} at ${formatCents(
    sharePrice ?? outcomeToken?.price ?? 0,
  )}`;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full gap-4 p-4"
    >
      <TouchableOpacity testID="back-button" onPress={onBack}>
        <Icon name={IconName.ArrowLeft} size={IconSize.Md} />
      </TouchableOpacity>
      <Image
        source={{ uri: outcomeImage }}
        style={tw.style('w-10 h-10 rounded')}
      />
      <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 min-w-0">
        <Box flexDirection={BoxFlexDirection.Row} twClassName="min-w-0 gap-4">
          <Box twClassName="flex-1 min-w-0">
            <Text
              variant={TextVariant.HeadingSm}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          </Box>
        </Box>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="min-w-0 gap-4">
          <Box twClassName="flex-1 min-w-0">
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
      </Box>
    </Box>
  );
};

export default PredictBuyPreviewHeader;
