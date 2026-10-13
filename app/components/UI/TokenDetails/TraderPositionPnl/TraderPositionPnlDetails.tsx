import {
  Button,
  ButtonSize,
  ButtonVariant,
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../locales/i18n';

export interface TraderPositionPnlDetailsProps {
  averageCost: string;
  realizedPnl: string;
  unrealizedPnl: string;
  holdTime: string;
  onShare?: () => void;
  testID?: string;
}

interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: TextColor;
  testID: string;
}

const getPnlColor = (value: string): TextColor | undefined => {
  if (value.startsWith('-')) {
    return TextColor.ErrorDefault;
  }
  if (value.startsWith('+')) {
    return TextColor.SuccessDefault;
  }
  return undefined;
};

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  valueColor,
  testID,
}) => (
  <Box
    testID={testID}
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    twClassName="py-1"
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      color={valueColor}
      testID={`${testID}-value`}
    >
      {value}
    </Text>
  </Box>
);

const TraderPositionPnlDetails: React.FC<TraderPositionPnlDetailsProps> = ({
  averageCost,
  realizedPnl,
  unrealizedPnl,
  holdTime,
  onShare,
  testID = 'token-details-trader-position-pnl-expanded-details',
}) => {
  const isShareDisabled = !onShare;

  return (
    <Box testID={testID} twClassName="gap-3">
      <Button
        testID={`${testID}-share`}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        startIconName={IconName.Share}
        accessibilityLabel={strings(
          'asset_overview.position_pnl.share_to_feed',
        )}
        accessibilityState={{ disabled: isShareDisabled }}
        disabled={isShareDisabled}
        onPress={onShare}
        twClassName={`w-full rounded-full bg-muted ${
          isShareDisabled ? 'opacity-50' : ''
        }`}
      >
        {strings('asset_overview.position_pnl.share_to_feed')}
      </Button>
      <Box twClassName="gap-1">
        <DetailRow
          testID={`${testID}-average-cost`}
          label={strings('asset_overview.position_pnl.average_cost')}
          value={averageCost}
        />
        <DetailRow
          testID={`${testID}-realized-pnl`}
          label={strings('asset_overview.position_pnl.realized_pnl')}
          value={realizedPnl}
          valueColor={getPnlColor(realizedPnl)}
        />
        <DetailRow
          testID={`${testID}-unrealized-pnl`}
          label={strings('asset_overview.position_pnl.unrealized_pnl')}
          value={unrealizedPnl}
          valueColor={getPnlColor(unrealizedPnl)}
        />
        <DetailRow
          testID={`${testID}-hold-time`}
          label={strings('asset_overview.position_pnl.hold_time')}
          value={holdTime}
        />
      </Box>
    </Box>
  );
};

export default TraderPositionPnlDetails;
