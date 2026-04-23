import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { strings } from '../../../../../../../locales/i18n';

const SKELETON_TOKEN_WIDTH = 80;
const SKELETON_FIAT_WIDTH = 60;
const SKELETON_HEIGHT = 16;
const SKELETON_GAP = 6;

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: 4,
  },
  skeletonGap: {
    height: SKELETON_GAP,
  },
});

export interface QuoteDisplayProps {
  cryptoAmount: string;
  fiatAmount: string | null;
  isLoading?: boolean;
  showWarningIcon?: boolean;
  quoteUnavailable?: boolean;
}

const QuoteDisplay: React.FC<QuoteDisplayProps> = ({
  cryptoAmount,
  fiatAmount,
  isLoading = false,
  showWarningIcon = false,
  quoteUnavailable = false,
}) => {
  if (isLoading) {
    return (
      <Box twClassName="items-end">
        <Skeleton
          width={SKELETON_TOKEN_WIDTH}
          height={SKELETON_HEIGHT}
          style={styles.skeleton}
        />
        <View style={styles.skeletonGap} />
        <Skeleton
          width={SKELETON_FIAT_WIDTH}
          height={SKELETON_HEIGHT}
          style={styles.skeleton}
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
          color={IconColor.WarningDefault}
        />
      </Box>
    );
  }

  if (quoteUnavailable) {
    return (
      <Box twClassName="items-end justify-center">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('fiat_on_ramp.quote_unavailable')}
        </Text>
      </Box>
    );
  }

  if (!cryptoAmount && fiatAmount === null) {
    return null;
  }

  return (
    <Box twClassName="items-end">
      {cryptoAmount ? (
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {cryptoAmount}
        </Text>
      ) : null}
      {fiatAmount !== null ? (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {fiatAmount}
        </Text>
      ) : null}
    </Box>
  );
};

export default QuoteDisplay;
