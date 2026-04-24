import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { strings } from '../../../../../../../locales/i18n';

const USD_PRESETS = ['1', '20', '50', '100'];

interface QuickBuySkeletonRowProps {
  label: string;
  valueWidth: number;
  showTokenBadge?: boolean;
  showTrailingIcon?: boolean;
  showInfoIcon?: boolean;
}

const QuickBuySkeletonRow: React.FC<QuickBuySkeletonRowProps> = ({
  label,
  valueWidth,
  showTokenBadge = false,
  showTrailingIcon = false,
  showInfoIcon = false,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {label}
        </Text>
        {showInfoIcon ? (
          <Skeleton width={16} height={16} style={tw.style('rounded-full')} />
        ) : null}
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        {showTokenBadge ? (
          <Skeleton width={20} height={20} style={tw.style('rounded-full')} />
        ) : null}
        <Skeleton
          width={valueWidth}
          height={20}
          style={tw.style('rounded-md')}
        />
        {showTrailingIcon ? (
          <Skeleton width={16} height={16} style={tw.style('rounded-full')} />
        ) : null}
      </Box>
    </Box>
  );
};

const QuickBuyBottomSheetSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box testID="quick-buy-content-loading">
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={2}
        twClassName="py-12"
      >
        <Skeleton width={176} height={48} style={tw.style('rounded-xl')} />
        <Skeleton width={124} height={20} style={tw.style('rounded-md')} />
      </Box>

      <Box twClassName="pt-4 pb-6 px-4">
        <Box flexDirection={BoxFlexDirection.Row} gap={3}>
          {USD_PRESETS.map((preset) => (
            <Box key={preset} twClassName="flex-1">
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonBaseSize.Md}
                onPress={() => undefined}
                isDisabled
                isFullWidth
                testID={`quick-buy-skeleton-preset-${preset}`}
              >
                {`$${preset}`}
              </Button>
            </Box>
          ))}
        </Box>
      </Box>

      <Box twClassName="px-4 pb-6" gap={6}>
        <Box gap={4}>
          <QuickBuySkeletonRow
            label={strings('social_leaderboard.quick_buy.pay_with')}
            valueWidth={92}
            showTokenBadge
            showTrailingIcon
          />

          <QuickBuySkeletonRow
            label={strings('social_leaderboard.quick_buy.total')}
            valueWidth={56}
            showInfoIcon
          />

          <QuickBuySkeletonRow
            label={strings('social_leaderboard.quick_buy.est_points')}
            valueWidth={64}
            showInfoIcon
          />
        </Box>

        <Skeleton
          width="100%"
          height={48}
          style={tw.style('rounded-xl')}
          testID="quick-buy-skeleton-confirm-button"
        />
      </Box>
    </Box>
  );
};

export default QuickBuyBottomSheetSkeleton;
