import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyBalanceSummaryTestIds } from './MoneyBalanceSummary.testIds';
import { isPositiveNumberOrZero } from '../../utils/number';
import { MoneyBalanceDisplayState } from '../../types';

interface MoneyBalanceSummaryProps {
  displayState: MoneyBalanceDisplayState;
  /**
   * APY expressed as a percentage (e.g. 3 for 3%). Hidden in non-balance states.
   */
  apy: number | undefined;
  /**
   * Handler for the APY info icon. Opens the APY tooltip sheet.
   */
  onApyInfoPress?: () => void;
}

const BalanceSkeleton = () => (
  <Skeleton
    height={48}
    width={160}
    twClassName="mb-2 rounded-md"
    testID={MoneyBalanceSummaryTestIds.BALANCE_SKELETON}
  />
);

const MoneyBalanceSummary = ({
  displayState,
  apy,
  onApyInfoPress,
}: MoneyBalanceSummaryProps) => {
  const showApy = displayState.kind === 'balance';

  const renderApySlot = () => {
    if (displayState.kind === 'loading' || displayState.kind === 'retrying') {
      return (
        <Skeleton
          height={24}
          width={94}
          twClassName="rounded-md"
          testID={MoneyBalanceSummaryTestIds.APY_SKELETON}
        />
      );
    }
    if (!showApy || !isPositiveNumberOrZero(apy)) {
      return null;
    }
    return (
      <>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.SuccessDefault}
          testID={MoneyBalanceSummaryTestIds.APY}
        >
          {strings('money.apy_label', { percentage: apy })}
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('money.apy_currency_suffix')}
          </Text>
        </Text>
        {onApyInfoPress && displayState.kind === 'balance' && (
          <ButtonIcon
            iconName={IconName.Info}
            iconProps={{ color: IconColor.IconAlternative }}
            size={ButtonIconSize.Sm}
            onPress={onApyInfoPress}
            accessibilityLabel={strings('money.apy_info_label')}
            testID={MoneyBalanceSummaryTestIds.APY_INFO_BUTTON}
          />
        )}
      </>
    );
  };

  const renderBalanceSlot = () => {
    switch (displayState.kind) {
      case 'loading':
        return <BalanceSkeleton />;
      case 'retrying':
        return <BalanceSkeleton />;
      case 'error':
        return (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="mb-2 gap-2"
            testID={MoneyBalanceSummaryTestIds.BALANCE_ERROR}
          >
            <Text
              variant={TextVariant.BodyLg}
              color={TextColor.TextAlternative}
            >
              {strings('money.balance_unavailable')}
            </Text>
            <ButtonIcon
              iconName={IconName.Refresh}
              iconProps={{ color: IconColor.InfoDefault, size: IconSize.Lg }}
              size={ButtonIconSize.Sm}
              onPress={displayState.onRetry}
              accessibilityLabel={strings('money.balance_retry')}
              testID={MoneyBalanceSummaryTestIds.BALANCE_RETRY}
            />
          </Box>
        );
      case 'balance':
        return (
          <Text
            variant={TextVariant.DisplayLg}
            fontWeight={FontWeight.Bold}
            testID={MoneyBalanceSummaryTestIds.BALANCE}
            twClassName="mb-2"
          >
            {displayState.value}
          </Text>
        );
      case 'featureDisabled':
        return (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={MoneyBalanceSummaryTestIds.BALANCE_FEATURE_DISABLED}
            twClassName="mb-2"
          >
            {strings('money.balance_feature_disabled')}
          </Text>
        );
      case 'noAccount':
        return (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={MoneyBalanceSummaryTestIds.BALANCE_NO_ACCOUNT}
            twClassName="mb-2"
          >
            {strings('money.balance_no_account')}
          </Text>
        );
      default:
        return null;
    }
  };

  return (
    <Box twClassName="pt-3" testID={MoneyBalanceSummaryTestIds.CONTAINER}>
      <Box twClassName="px-4 pt-2">
        {renderBalanceSlot()}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          {renderApySlot()}
        </Box>
      </Box>
    </Box>
  );
};

export default MoneyBalanceSummary;
