import {
  Button,
  ButtonSize,
  ButtonVariant,
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  IconName,
  SectionDivider,
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
  twClassName?: string;
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
  twClassName,
}) => (
  <Box
    testID={testID}
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    twClassName={twClassName ? `py-1 ${twClassName}` : 'py-1'}
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
}) => (
  <Box testID={testID} twClassName="gap-3">
    {onShare ? (
      <Button
        testID={`${testID}-share`}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        startIconName={IconName.Share}
        accessibilityLabel={strings(
          'asset_overview.position_pnl.share_to_feed',
        )}
        onPress={onShare}
        twClassName="w-full rounded-full bg-muted"
      >
        {strings('asset_overview.position_pnl.share_to_feed')}
      </Button>
    ) : (
      // When sharing is unavailable (social flag/A-B/position all absent) there
      // is no button to separate the position header from the details, so show
      // a divider in its place instead (ASSETS-4183). `marginVertical` is a
      // Tailwind spacing step (my-2 = 8px); combined with the 12px from the
      // parent `gap-3` / header margin, the rule gets ~20px above and below.
      <SectionDivider marginVertical={2} testID={`${testID}-divider`} />
    )}
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
        twClassName="mb-2"
      />
    </Box>
  </Box>
);

export default TraderPositionPnlDetails;
