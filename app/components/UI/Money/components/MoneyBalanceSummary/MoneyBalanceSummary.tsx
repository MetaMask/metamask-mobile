import React from 'react';
import { TouchableOpacity } from 'react-native';
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
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import TextShimmer from '../TextShimmer';
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
  /**
   * Whether the balance should be hidden behind bullet characters.
   */
  privacyMode?: boolean;
  /**
   * Handler for tapping the balance. Toggles privacy mode. When omitted, the
   * balance is not pressable.
   */
  onBalancePress?: () => void;
}

const MoneyBalanceSummary = ({
  displayState,
  apy,
  onApyInfoPress,
  privacyMode = false,
  onBalancePress,
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
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          testID={MoneyBalanceSummaryTestIds.APY}
        >
          <TextShimmer>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
            >
              {strings('money.apy_label', { percentage: apy })}
            </Text>
          </TextShimmer>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('money.apy_currency_suffix')}
          </Text>
        </Box>
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

  const wrapPressable = (content: React.ReactNode) =>
    onBalancePress ? (
      <TouchableOpacity
        onPress={onBalancePress}
        testID={MoneyBalanceSummaryTestIds.BALANCE_PRESSABLE}
      >
        {content}
      </TouchableOpacity>
    ) : (
      content
    );

  const renderBalanceSlot = () => {
    switch (displayState.kind) {
      case 'balance':
        return wrapPressable(
          <SensitiveText
            variant={TextVariant.DisplayLg}
            fontWeight={FontWeight.Bold}
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            testID={MoneyBalanceSummaryTestIds.BALANCE}
          >
            {displayState.value}
          </SensitiveText>,
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
        return wrapPressable(
          <SensitiveText
            variant={TextVariant.DisplayLg}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextAlternative}
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            testID={MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE}
          >
            {displayState.lastKnownValue ??
              strings('money.balance_unavailable_value')}
          </SensitiveText>,
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
