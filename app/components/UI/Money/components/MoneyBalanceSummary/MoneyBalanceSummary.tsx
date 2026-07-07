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

const MoneyBalanceSummary = ({
  displayState,
  apy,
  onApyInfoPress,
}: MoneyBalanceSummaryProps) => {
  // APY + mUSD label stays visible alongside the balance and in the
  // unavailable states (dash / last known figure).
  const showApy =
    displayState.kind === 'balance' || displayState.kind === 'unavailable';

  const renderApySlot = () => {
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
        {onApyInfoPress && (
          <ButtonIcon
            iconName={IconName.Info}
            iconProps={{ color: IconColor.IconAlternative, size: IconSize.Sm }}
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
      case 'balance':
        return (
          <Text
            variant={TextVariant.DisplayLg}
            fontWeight={FontWeight.Bold}
            testID={MoneyBalanceSummaryTestIds.BALANCE}
          >
            {displayState.value}
          </Text>
        );
      case 'noAccount':
        return (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={MoneyBalanceSummaryTestIds.BALANCE_NO_ACCOUNT}
          >
            {strings('money.balance_no_account')}
          </Text>
        );
      case 'unavailable':
        // A previously cached balance renders as a muted "last known" figure;
        // with no cache the slot shows a dash. Both pair with the BannerAlert.
        return (
          <Text
            variant={TextVariant.DisplayLg}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextAlternative}
            testID={MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE}
          >
            {displayState.lastKnownValue ??
              strings('money.balance_unavailable_value')}
          </Text>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      twClassName="px-4 pt-4 gap-1"
      testID={MoneyBalanceSummaryTestIds.CONTAINER}
    >
      {renderBalanceSlot()}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1"
      >
        {renderApySlot()}
      </Box>
    </Box>
  );
};

export default MoneyBalanceSummary;
