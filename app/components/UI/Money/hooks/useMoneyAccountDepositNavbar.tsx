import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { MUSD_CONVERSION_APY } from '../../Earn/constants/musd';
import { strings } from '../../../../../locales/i18n';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';
import { TooltipModal } from '../../../Views/confirmations/components/UI/Tooltip/Tooltip';

const styles = StyleSheet.create({
  headerRight: {
    marginRight: 16,
  },
});

/**
 * Hook that sets up the Money Account deposit navbar with the conversion
 * tooltip. Uses the centralized rejection logic from useNavbar.
 *
 */
export function useMoneyAccountDepositNavbar() {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const onInfoPress = useCallback(() => setTooltipOpen(true), []);

  const renderHeaderRight = useCallback(
    () => (
      <View style={styles.headerRight}>
        <ButtonIcon
          iconName={IconName.Info}
          size={ButtonIconSize.Md}
          iconProps={{ color: IconColor.IconDefault }}
          onPress={onInfoPress}
        />
      </View>
    ),
    [onInfoPress],
  );

  const overrides = useMemo(
    () => ({
      headerRight: renderHeaderRight,
    }),
    [renderHeaderRight],
  );

  useNavbar(strings('confirm.title.money_account_add_money'), true, overrides);

  const TooltipNode = (
    <TooltipModal
      open={tooltipOpen}
      setOpen={setTooltipOpen}
      content={
        <Text variant={TextVariant.BodyMD}>
          {strings('money.deposit_tooltip_description', {
            percentage: MUSD_CONVERSION_APY,
          })}
        </Text>
      }
      title={strings('money.deposit_tooltip_title')}
      tooltipTestId="money-account-deposit-navbar-tooltip"
    />
  );

  return { TooltipNode };
}
