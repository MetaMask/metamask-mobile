import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { AccountGroupId } from '@metamask/account-api';
import {
  Icon,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { AvatarAccountType } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { AccountCellIds } from '../../../../component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.testIds';
import {
  createMockAccountGroup,
  createMockInternalAccountsFromGroups,
  createMockState,
  createMockWallet,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';
import ManageAccountRow, { ManageAccountRowVariant } from './ManageAccountRow';
import {
  getManageAccountRowId,
  getManageAccountRowEyeToggleId,
  getManageAccountRowRemoveId,
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

  const findIconByName = (
    utils: ReturnType<typeof renderRow>,
    name: IconName,
  ) =>
    utils.UNSAFE_queryAllByType(Icon).find((icon) => icon.props.name === name);

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
      expect(eyeToggle.props.accessibilityLabel).toBe('Hide account');
      expect(eyeToggle.props.accessibilityRole).toBe('button');
    });

    it('fires onToggleHidden with the inverted value on the eye of a hidden row', () => {
      const onToggleHidden = jest.fn();
      const { getByTestId } = renderRow({
        isHidden: true,
        onToggleHidden,
      });

      fireEvent.press(
        getByTestId(getManageAccountRowEyeToggleId(GROUP_ID), {
          includeHiddenElements: true,
        }),
      );

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
        {
          includeHiddenElements: true,
        },
      );

      expect(eyeToggle.props.accessibilityLabel).toBe('Unhide account');
      expect(findIconByName(utils, IconName.EyeSlash)).toBeDefined();
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

      expect(row.props.accessibilityElementsHidden).toBe(true);
      expect(row.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(nonInteractiveContentRegions.length).toBeGreaterThan(0);
      expect(
        getByTestId(getManageAccountRowEyeToggleId(GROUP_ID), {
          includeHiddenElements: true,
        }),
      ).toBeEnabled();
      expect(findIconByName(utils, IconName.EyeSlash)).toBeDefined();
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

      expect(row.props.accessibilityElementsHidden).toBe(false);
      expect(nonInteractiveRegions).toHaveLength(0);
      expect(findIconByName(utils, IconName.EyeSlash)).toBeUndefined();
      expect(findIconByName(utils, IconName.Eye)).toBeDefined();
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
      const removeIcon = findIconByName(utils, IconName.RemoveMinus);

      expect(removeControl.props.accessibilityLabel).toBe('Remove account');
      expect(removeControl.props.accessibilityRole).toBe('button');
      expect(removeControl).toBeEnabled();
      expect(removeIcon).toBeDefined();
      expect(removeIcon?.props.color).toBe(IconColor.ErrorDefault);
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

      expect(
        utils.getByTestId(getManageAccountRowEyeToggleId(GROUP_ID)).props
          .accessibilityLabel,
      ).toBe('Hide account');
      expect(
        utils.getByTestId(getManageAccountRowRemoveId(GROUP_ID)),
      ).toBeOnTheScreen();
      expect(findIconByName(utils, IconName.Eye)).toBeDefined();
      expect(findIconByName(utils, IconName.RemoveMinus)).toBeDefined();
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

      const eyeToggle = getByTestId(getManageAccountRowEyeToggleId(GROUP_ID), {
        includeHiddenElements: true,
      });
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
