import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import type { TraderPositionPnlDetailsProps } from './TraderPositionPnlDetails';

const DEFAULT_TEST_ID = 'token-details-trader-position-pnl';
const positionRowsStyle = { flex: 1 };
const POSITION_BLOCK_MARGIN = 12;

export interface TraderPositionPnlProps {
  /** Formatted position value in the selected display currency. */
  positionValue?: string;
  /** Formatted unrealized PnL values. Omit when PnL should be hidden. */
  pnl?: {
    amount: string;
    percentage?: string;
    isProfit: boolean;
  };
  /** Shows the initial loading skeleton when no position value is available. */
  isLoading?: boolean;
  /** Current expanded state of the position footer. */
  isExpanded?: boolean;
  /** Content shown inside the expanded position footer. */
  expandedDetails?: TraderPositionPnlDetailsProps;
  /** Called when the collapsed position header is toggled. */
  onToggleExpanded?: (isExpanded: boolean) => void;
  /** Test ID for the position header. */
  testID?: string;
}

const TraderPositionPnl: React.FC<TraderPositionPnlProps> = ({
  positionValue,
  pnl,
  isLoading = false,
  isExpanded = false,
  onToggleExpanded,
  testID = DEFAULT_TEST_ID,
}) => {
  const hasPositionValue = positionValue !== undefined;
  const showLoadingSkeleton = isLoading && !hasPositionValue;
  const isExpandable = Boolean(pnl && onToggleExpanded);
  const toggleTestID = `${testID}-toggle`;
  const toggleExpanded = () => {
    onToggleExpanded?.(!isExpanded);
  };

  if (!hasPositionValue && !showLoadingSkeleton) {
    return null;
  }

  const positionRows = (
    <Box twClassName="gap-0.5">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="min-h-6"
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          testID={`${testID}-label`}
        >
          {strings('social_leaderboard.trader_position.your_position')}
        </Text>
        {showLoadingSkeleton ? (
          <Skeleton
            testID={`${testID}-value-loading`}
            height={20}
            width={72}
            twClassName="rounded"
          />
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            testID={`${testID}-value`}
          >
            {positionValue}
          </Text>
        )}
      </Box>
      {pnl && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          testID={`${testID}-unrealized-pnl`}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={`${testID}-unrealized-pnl-label`}
          >
            {strings('social_leaderboard.trader_position.unrealized_pnl')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={
              pnl.isProfit ? TextColor.SuccessDefault : TextColor.ErrorDefault
            }
            testID={`${testID}-unrealized-pnl-value`}
          >
            {pnl.amount}
            {pnl.percentage ? ` (${pnl.percentage})` : ''}
          </Text>
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      testID={testID}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-2"
      style={{ marginBottom: POSITION_BLOCK_MARGIN }}
    >
      {isExpandable ? (
        <Pressable
          testID={`${testID}-rows`}
          accessible={false}
          onPress={toggleExpanded}
          style={positionRowsStyle}
        >
          {positionRows}
        </Pressable>
      ) : (
        <Box twClassName="flex-1">{positionRows}</Box>
      )}
      {isExpandable && (
        <ButtonIcon
          iconName={isExpanded ? IconName.ArrowUp : IconName.ArrowDown}
          size={ButtonIconSize.Sm}
          testID={toggleTestID}
          accessibilityLabel={strings(
            isExpanded
              ? 'social_leaderboard.trader_position.collapse_position'
              : 'social_leaderboard.trader_position.expand_position',
          )}
          accessibilityState={{ expanded: isExpanded }}
          onPress={toggleExpanded}
        />
      )}
    </Box>
  );
};

export default TraderPositionPnl;
