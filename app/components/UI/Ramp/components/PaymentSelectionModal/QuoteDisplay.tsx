import React from 'react';
import { View } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { Skeleton } from '../../../../../component-library/components/Skeleton';

const SKELETON_TOKEN_WIDTH = 80;
const SKELETON_FIAT_WIDTH = 60;
const SKELETON_HEIGHT = 16;
const SKELETON_GAP = 6;

export interface QuoteDisplayProps {
  cryptoAmount: string;
  fiatAmount: string | null;
  isLoading?: boolean;
  showWarningIcon?: boolean;
}

const QuoteDisplay: React.FC<QuoteDisplayProps> = ({
  cryptoAmount,
  fiatAmount,
  isLoading = false,
  showWarningIcon = false,
}) => {
  if (isLoading) {
    return (
      <Box twClassName="items-end">
        <Skeleton
          width={SKELETON_TOKEN_WIDTH}
          height={SKELETON_HEIGHT}
          style={{ borderRadius: 4 }}
        />
        <View style={{ height: SKELETON_GAP }} />
        <Skeleton
          width={SKELETON_FIAT_WIDTH}
          height={SKELETON_HEIGHT}
          style={{ borderRadius: 4 }}
        />
      </Box>
    );
  }

  if (showWarningIcon) {
    return (
      <Box twClassName="items-end justify-center">
        <Icon
          name={IconName.Warning}
          size={IconSize.Sm}
          color={IconColor.Warning}
        />
      </Box>
    );
  }

  if (!cryptoAmount && fiatAmount === null) {
    return null;
  }

  return (
    <Box twClassName="items-end">
      {cryptoAmount ? (
        <Text variant={TextVariant.BodyMDMedium}>{cryptoAmount}</Text>
      ) : null}
      {fiatAmount !== null ? (
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {fiatAmount}
        </Text>
      ) : null}
    </Box>
  );
};

export default QuoteDisplay;
