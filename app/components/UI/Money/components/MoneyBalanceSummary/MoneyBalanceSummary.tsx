import React from 'react';
import { Pressable, TouchableOpacity } from 'react-native';
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
  TitleHub,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import DottedUnderline from '../../../../../component-library/components-temp/DottedUnderline';
import TextShimmer from '../TextShimmer';
import { MoneyBalanceSummaryTestIds } from './MoneyBalanceSummary.testIds';
import { isPositiveNumberOrZero } from '../../utils/number';
import { MoneyBalanceDisplayState } from '../../types';
import { useTheme } from '../../../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
  /**
   * Set by the pushed Money screen, which moves the title out of the header
   * and into a `TitleHub` here so it can collapse on scroll. The Money tab
   * leaves this unset and keeps its title in the header.
   */
  showTitle?: boolean;
}

const MoneyBalanceSummary = ({
  displayState,
  apy,
  onApyInfoPress,
  privacyMode = false,
  onBalancePress,
  showTitle = false,
}: MoneyBalanceSummaryProps) => {
  const { colors } = useTheme();
  const tw = useTailwind();

  // APY + mUSD label stays visible alongside the balance and in the
  // unavailable states (dash / last known figure).
  const showApy =
    displayState.kind === 'balance' || displayState.kind === 'unavailable';
  const hasApy = showApy && isPositiveNumberOrZero(apy);

  const apyLabel = hasApy ? (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      testID={MoneyBalanceSummaryTestIds.APY}
    >
      <Pressable
        onPress={onApyInfoPress}
        style={({ pressed }) => pressed && tw.style('opacity-50')}
      >
        <DottedUnderline color={colors.success.default}>
          <TextShimmer>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
              numberOfLines={1}
            >
              {strings('money.apy_label', { percentage: apy })}
            </Text>
          </TextShimmer>
        </DottedUnderline>
      </Pressable>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {strings('money.apy_currency_suffix')}
      </Text>
    </Box>
  ) : undefined;

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

  if (showTitle) {
    return (
      <TitleHub
        testID={MoneyBalanceSummaryTestIds.CONTAINER}
        twClassName="px-4 pb-3"
        title={strings('money.title')}
        titleProps={{ testID: MoneyBalanceSummaryTestIds.TITLE }}
        amount={renderBalanceSlot()}
        bottomLabel={apyLabel}
      />
    );
  }

  return (
    <Box twClassName="px-4 gap-1" testID={MoneyBalanceSummaryTestIds.CONTAINER}>
      {renderBalanceSlot()}
      {apyLabel}
    </Box>
  );
};

export default MoneyBalanceSummary;
