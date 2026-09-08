import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { AccountGroupId } from '@metamask/account-api';
import { IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../util/theme';
import { AvatarAccountType } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { AccountCellIds } from '../../../../component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.testIds';
import {
  createMockAccountGroup,
  createMockInternalAccountsFromGroups,
  createMockState,
  createMockWallet,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';
import { strings } from '../../../../../locales/i18n';
import ManageAccountRow, { ManageAccountRowVariant } from './ManageAccountRow';
import {
  getManageAccountRowId,
  getManageAccountRowEyeToggleId,
  getManageAccountRowEyeIconId,
  getManageAccountRowRemoveId,
  getManageAccountRowRemoveIconId,
} from '../ManageAccounts.testIds';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
}));

describe('ManageAccountRow', () => {
  const GROUP_ID = 'keyring:test-group/ethereum' as AccountGroupId;
  const accountGroup = createMockAccountGroup(GROUP_ID, 'Account 1', [
    'account-1',
  ]);

  const renderRow = ({
    isHidden = false,
    variant = ManageAccountRowVariant.Hide,
    onToggleHidden,
    onRemove,
  }: {
    isHidden?: boolean;
    variant?: ManageAccountRowVariant;
    onToggleHidden: (groupId: AccountGroupId, nextHidden: boolean) => void;
    onRemove?: (groupId: AccountGroupId) => void;
  }) => {
    const wallet = createMockWallet('test-group', 'Test Wallet', [
      accountGroup,
    ]);
    const internalAccounts = createMockInternalAccountsFromGroups([
      accountGroup,
    ]);

    return renderWithProvider(
      <ManageAccountRow
        accountGroup={accountGroup}
        isHidden={isHidden}
        variant={variant}
        onToggleHidden={onToggleHidden}
        onRemove={onRemove}
        avatarAccountType={AvatarAccountType.Maskicon}
      />,
      {
        state: createMockState([wallet], internalAccounts),
      },
    );
  };

  describe('hide variant (entropy / HD rows)', () => {
    it('fires onToggleHidden with the inverted value on the eye of a visible row', () => {
      const onToggleHidden = jest.fn();
      const { getByTestId } = renderRow({ onToggleHidden });

      fireEvent.press(getByTestId(getManageAccountRowEyeToggleId(GROUP_ID)));

      expect(onToggleHidden).toHaveBeenCalledTimes(1);
      expect(onToggleHidden).toHaveBeenCalledWith(GROUP_ID, true);
    });

    it('keeps the eye enabled and labeled "Hide account" on a visible row', () => {
      const onToggleHidden = jest.fn();
      const { getByTestId } = renderRow({ onToggleHidden });

      const eyeToggle = getByTestId(getManageAccountRowEyeToggleId(GROUP_ID));

      expect(eyeToggle).toBeEnabled();
      expect(eyeToggle.props.accessibilityLabel).toBe(
        strings('multichain_accounts.account_details.hide_account'),
      );
      expect(eyeToggle.props.accessibilityRole).toBe('button');
    });

    it('fires onToggleHidden with the inverted value on the eye of a hidden row', () => {
      const onToggleHidden = jest.fn();
      const { getByTestId } = renderRow({
        isHidden: true,
        onToggleHidden,
      });

      fireEvent.press(getByTestId(getManageAccountRowEyeToggleId(GROUP_ID)));

      expect(onToggleHidden).toHaveBeenCalledTimes(1);
      expect(onToggleHidden).toHaveBeenCalledWith(GROUP_ID, false);
    });

    it('renders the eye-slash state on a hidden row', () => {
      const onToggleHidden = jest.fn();
      const utils = renderRow({
        isHidden: true,
        onToggleHidden,
      });

      const eyeToggle = utils.getByTestId(
        getManageAccountRowEyeToggleId(GROUP_ID),
      );

      const eyeIcon = utils.getByTestId(getManageAccountRowEyeIconId(GROUP_ID));

      expect(eyeToggle.props.accessibilityLabel).toBe(
        strings('multichain_accounts.account_details.unhide_account'),
      );
      expect(eyeIcon).toBeOnTheScreen();
      expect(eyeIcon.props.name).toBe(IconName.EyeSlash);
    });

    it('marks a hidden row non-interactive while keeping the eye enabled', () => {
      const onToggleHidden = jest.fn();
      const utils = renderRow({
        isHidden: true,
        onToggleHidden,
      });
      const { getByTestId, root } = utils;

      const row = getByTestId(getManageAccountRowId(GROUP_ID), {
        includeHiddenElements: true,
      });
      const nonInteractiveRegions = root.findAll(
        (node) => node.props.pointerEvents === 'none',
      );
      const nonInteractiveContentRegions = nonInteractiveRegions.filter(
        (region) =>
          region.findAll(
            (child) => child.props.testID === AccountCellIds.CONTAINER,
          ).length > 0,
      );

      // The outer row must NOT hide its trailing actions from accessibility.
      expect(row.props.accessibilityElementsHidden).toBeFalsy();
      expect(row.props.importantForAccessibility).not.toBe(
        'no-hide-descendants',
      );
      // The accessibility hiding is scoped to the content region only.
      expect(nonInteractiveContentRegions.length).toBeGreaterThan(0);
      expect(
        nonInteractiveContentRegions[0].props.accessibilityElementsHidden,
      ).toBe(true);
      expect(
        nonInteractiveContentRegions[0].props.importantForAccessibility,
      ).toBe('no-hide-descendants');
      // The eye toggle stays reachable by default (no `includeHiddenElements`).
      expect(
        getByTestId(getManageAccountRowEyeToggleId(GROUP_ID)),
      ).toBeEnabled();
      expect(
        getByTestId(getManageAccountRowEyeIconId(GROUP_ID)),
      ).toBeOnTheScreen();
    });

    it('keeps a visible row interactive outside the content region', () => {
      const onToggleHidden = jest.fn();
      const utils = renderRow({
        onToggleHidden,
      });
      const { getByTestId, root } = utils;

      const row = getByTestId(getManageAccountRowId(GROUP_ID));
      const nonInteractiveRegions = root.findAll(
        (node) => node.props.pointerEvents === 'none',
      );
      const hiddenFromA11y = root.findAll(
        (node) => node.props.accessibilityElementsHidden === true,
      );
      const eyeIcon = getByTestId(getManageAccountRowEyeIconId(GROUP_ID));

      expect(row.props.accessibilityElementsHidden).toBeFalsy();
      expect(nonInteractiveRegions).toHaveLength(0);
      expect(hiddenFromA11y).toHaveLength(0);
      expect(eyeIcon).toBeOnTheScreen();
      expect(eyeIcon.props.name).toBe(IconName.Eye);
    });

    it('renders no remove control', () => {
      const onToggleHidden = jest.fn();
      const { queryByTestId } = renderRow({ onToggleHidden });

      expect(queryByTestId(getManageAccountRowRemoveId(GROUP_ID))).toBeNull();
    });
  });

  describe('remove variant (imported rows)', () => {
    it('renders the error-colored minus control labeled "Remove account"', () => {
      const onRemove = jest.fn();
      const utils = renderRow({
        variant: ManageAccountRowVariant.Remove,
        onToggleHidden: jest.fn(),
        onRemove,
      });

      const removeControl = utils.getByTestId(
        getManageAccountRowRemoveId(GROUP_ID),
      );
      const removeIcon = utils.getByTestId(
        getManageAccountRowRemoveIconId(GROUP_ID),
      );

      expect(removeControl.props.accessibilityLabel).toBe(
        strings('multichain_accounts.account_details.remove_account'),
      );
      expect(removeControl.props.accessibilityRole).toBe('button');
      expect(removeControl).toBeEnabled();
      expect(removeIcon).toBeOnTheScreen();
      expect(removeIcon.props.name).toBe(IconName.RemoveMinus);
      expect(removeIcon).toHaveStyle({
        color: mockTheme.colors.error.default,
      });
    });

    it('fires onRemove with the group ID on press', () => {
      const onRemove = jest.fn();
      const { getByTestId } = renderRow({
        variant: ManageAccountRowVariant.Remove,
        onToggleHidden: jest.fn(),
        onRemove,
      });

      fireEvent.press(getByTestId(getManageAccountRowRemoveId(GROUP_ID)));

      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith(GROUP_ID);
    });

    it('renders no eye toggle', () => {
      const { queryByTestId } = renderRow({
        variant: ManageAccountRowVariant.Remove,
        onToggleHidden: jest.fn(),
        onRemove: jest.fn(),
      });

      expect(
        queryByTestId(getManageAccountRowEyeToggleId(GROUP_ID)),
      ).toBeNull();
    });
  });

  describe('hideAndRemove variant (hardware rows)', () => {
    it('renders both the eye and the remove controls', () => {
      const onToggleHidden = jest.fn();
      const onRemove = jest.fn();
      const utils = renderRow({
        variant: ManageAccountRowVariant.HideAndRemove,
        onToggleHidden,
        onRemove,
      });

      const eyeIcon = utils.getByTestId(getManageAccountRowEyeIconId(GROUP_ID));
      const removeIcon = utils.getByTestId(
        getManageAccountRowRemoveIconId(GROUP_ID),
      );

      expect(
        utils.getByTestId(getManageAccountRowEyeToggleId(GROUP_ID)).props
          .accessibilityLabel,
      ).toBe(strings('multichain_accounts.account_details.hide_account'));
      expect(
        utils.getByTestId(getManageAccountRowRemoveId(GROUP_ID)),
      ).toBeOnTheScreen();
      expect(eyeIcon).toBeOnTheScreen();
      expect(eyeIcon.props.name).toBe(IconName.Eye);
      expect(removeIcon).toBeOnTheScreen();
      expect(removeIcon.props.name).toBe(IconName.RemoveMinus);
    });

    it('fires each control independently', () => {
      const onToggleHidden = jest.fn();
      const onRemove = jest.fn();
      const { getByTestId } = renderRow({
        variant: ManageAccountRowVariant.HideAndRemove,
        onToggleHidden,
        onRemove,
      });

      fireEvent.press(getByTestId(getManageAccountRowEyeToggleId(GROUP_ID)));
      fireEvent.press(getByTestId(getManageAccountRowRemoveId(GROUP_ID)));

      expect(onToggleHidden).toHaveBeenCalledTimes(1);
      expect(onToggleHidden).toHaveBeenCalledWith(GROUP_ID, true);
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith(GROUP_ID);
    });

    it('disables the remove control on a hidden hardware row while keeping the eye enabled', () => {
      const onToggleHidden = jest.fn();
      const onRemove = jest.fn();
      const { getByTestId } = renderRow({
        isHidden: true,
        variant: ManageAccountRowVariant.HideAndRemove,
        onToggleHidden,
        onRemove,
      });

      const eyeToggle = getByTestId(getManageAccountRowEyeToggleId(GROUP_ID));
      const removeControl = getByTestId(getManageAccountRowRemoveId(GROUP_ID), {
        includeHiddenElements: true,
      });

      expect(eyeToggle).toBeEnabled();
      expect(removeControl).toBeDisabled();
    });
  });

  describe('none variant (snap rows)', () => {
    it('renders no trailing controls', () => {
      const { queryByTestId, getByTestId } = renderRow({
        variant: ManageAccountRowVariant.None,
        onToggleHidden: jest.fn(),
        onRemove: jest.fn(),
      });

      expect(
        queryByTestId(getManageAccountRowEyeToggleId(GROUP_ID)),
      ).toBeNull();
      expect(queryByTestId(getManageAccountRowRemoveId(GROUP_ID))).toBeNull();
      expect(getByTestId(AccountCellIds.CONTAINER)).toBeOnTheScreen();
    });
  });
});
