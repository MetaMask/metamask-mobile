import React, { useCallback } from 'react';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import type { AccountGroupId } from '@metamask/account-api';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import AccountCell from '../../../../component-library/components-temp/MultichainAccounts/AccountCell';
import type { AccountAvatarVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import {
  getManageAccountRowId,
  getManageAccountRowEyeToggleId,
  getManageAccountRowRemoveId,
} from '../ManageAccounts.testIds';

/**
 * Trailing action variant, decided by the view layer per row (type → variant
 * mapping is the wiring lane's job):
 * - `hide` — eye / eye-slash toggle (entropy & HD account rows only).
 * - `remove` — error-colored minus control (hardware & imported rows).
 * - `hideAndRemove` — both controls (hardware rows).
 * - `none` — no trailing action (snap rows).
 *
 * Spec §5 interim substitution: `IconName.MinusCircle` does not exist in the
 * icon set, so removal uses `IconName.RemoveMinus` pending design
 * confirmation.
 */
export enum ManageAccountRowVariant {
  Hide = 'hide',
  Remove = 'remove',
  HideAndRemove = 'hideAndRemove',
  None = 'none',
}

export interface ManageAccountRowProps {
  /** Account group rendered by this row. */
  accountGroup: AccountGroupObject;
  /** Whether the account group is hidden (`metadata.hidden === true`). */
  isHidden: boolean;
  /** Which trailing action(s) this row renders. */
  variant: ManageAccountRowVariant;
  /**
   * Hide / unhide handler. `nextHidden` is the value being applied
   * (`true` = hide, `false` = unhide). Required when the variant includes
   * the hide affordance; ignored otherwise.
   */
  onToggleHidden: (groupId: AccountGroupId, nextHidden: boolean) => void;
  /**
   * Remove handler for the row's account group. Rendered only when the
   * variant includes the remove affordance.
   */
  onRemove?: (groupId: AccountGroupId) => void;
  /** User's avatar preference, forwarded to `AccountCell`. */
  avatarAccountType: AccountAvatarVariant;
}

const doesVariantIncludeHide = (variant: ManageAccountRowVariant): boolean =>
  variant === ManageAccountRowVariant.Hide ||
  variant === ManageAccountRowVariant.HideAndRemove;

const doesVariantIncludeRemove = (variant: ManageAccountRowVariant): boolean =>
  variant === ManageAccountRowVariant.Remove ||
  variant === ManageAccountRowVariant.HideAndRemove;

/**
 * Row rendered for one account group while the screen is in management mode.
 */
const ManageAccountRow = ({
  accountGroup,
  isHidden,
  variant,
  onToggleHidden,
  onRemove,
  avatarAccountType,
}: ManageAccountRowProps) => {
  const tw = useTailwind();

  const handleToggleHidden = useCallback(() => {
    onToggleHidden(accountGroup.id, !isHidden);
  }, [accountGroup.id, isHidden, onToggleHidden]);

  const handleRemove = useCallback(() => {
    onRemove?.(accountGroup.id);
  }, [accountGroup.id, onRemove]);

  const showsHideToggle = doesVariantIncludeHide(variant);
  const showsRemove = doesVariantIncludeRemove(variant);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4"
      testID={getManageAccountRowId(accountGroup.id)}
      accessibilityElementsHidden={isHidden}
      importantForAccessibility={isHidden ? 'no-hide-descendants' : 'auto'}
    >
      {/*
        Content region (avatar, name, balance, and the future drag handle).
        When hidden: non-interactive (pointerEvents="none") and dimmed ~50%,
        per the spec's hidden account row state. The eye toggle below lives
        outside this region and remains the sole interactive control.
      */}
      <Box
        twClassName={`flex-1 ${isHidden ? 'opacity-50' : ''}`}
        pointerEvents={isHidden ? 'none' : 'auto'}
      >
        <AccountCell
          accountGroup={accountGroup}
          avatarAccountType={avatarAccountType}
          hideMenu
        />
      </Box>
      {showsRemove ? (
        <ButtonIcon
          iconName={IconName.RemoveMinus}
          size={ButtonIconSize.Md}
          onPress={handleRemove}
          // Spec §5 hidden-row state: the eye toggle is the sole enabled
          // control on a hidden row — remove disables with the row.
          isDisabled={isHidden}
          accessibilityLabel="Remove account"
          accessibilityRole="button"
          testID={getManageAccountRowRemoveId(accountGroup.id)}
          style={tw.style(showsHideToggle ? 'mx-1' : 'ml-3')}
          iconProps={{ color: IconColor.ErrorDefault }}
        />
      ) : null}
      {showsHideToggle ? (
        <ButtonIcon
          iconName={isHidden ? IconName.EyeSlash : IconName.Eye}
          size={ButtonIconSize.Md}
          onPress={handleToggleHidden}
          // Sole interactive control on a hidden row — never disabled.
          isDisabled={false}
          accessibilityLabel={isHidden ? 'Unhide account' : 'Hide account'}
          accessibilityRole="button"
          testID={getManageAccountRowEyeToggleId(accountGroup.id)}
          style={tw.style('ml-3')}
        />
      ) : null}
    </Box>
  );
};

export default React.memo(ManageAccountRow);
