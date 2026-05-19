import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';
import { useMoneyAccountDepositTooltip } from './useMoneyAccountDepositTooltip';

export function useMoneyAccountDepositNavbar() {
  const { TooltipNode, onInfoPress } = useMoneyAccountDepositTooltip(
    'money-account-deposit-navbar-tooltip',
  );

  const renderHeaderRight = useCallback(
    () => (
      <ButtonIcon
        iconName={IconName.Info}
        size={ButtonIconSize.Md}
        iconProps={{ color: IconColor.IconAlternative }}
        onPress={onInfoPress}
      />
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

  return { TooltipNode };
}
