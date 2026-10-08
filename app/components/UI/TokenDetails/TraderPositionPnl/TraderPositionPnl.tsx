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
import { strings } from '../../../../../locales/i18n';

const DEFAULT_TEST_ID = 'token-details-trader-position-pnl';

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
  /** Current expanded state, controlled by the future expanded-details flow. */
  isExpanded?: boolean;
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

  if (!hasPositionValue && !showLoadingSkeleton) {
    return null;
  }

  return (
    <Box
      testID={testID}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="mb-3 gap-2"
      accessibilityLabel={strings(
        'social_leaderboard.trader_position.position',
      )}
    >
      <Box twClassName="flex-1 gap-1">
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
          onPress={() => onToggleExpanded?.(!isExpanded)}
        />
      )}
    </Box>
  );
};

export default TraderPositionPnl;
