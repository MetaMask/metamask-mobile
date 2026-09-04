import '../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderComponentViewScreen } from '../../../../tests/component-view/render';
import {
  buildMultichainAccountsFixture,
  type MultichainAccountsFixture,
} from '../../../../tests/component-view/presets/multichainAccounts';
import ManageAccountsView, {
  type ManageAccountsSection,
} from './ManageAccountsView';
import { ManageAccountRowVariant } from './components/ManageAccountRow';
import {
  ManageAccountsViewSelectorsIDs,
  getManageAccountRowId,
  getManageAccountRowEyeToggleId,
  getManageAccountRowRemoveId,
  getManageAccountSectionHeaderId,
  getManageAccountSectionHeaderRemoveId,
  getManageAccountAddAccountFooterId,
} from './ManageAccounts.testIds';

const ACCOUNT_1_GROUP_ID = 'entropy:wallet1/0';
const ACCOUNT_2_GROUP_ID = 'entropy:wallet1/1';
const WALLET_NAME = 'Wallet 1';
const WALLET_ID = 'entropy:wallet1';
/** Placeholder until the ManageAccounts screen / route lands in a follow-up PR. */
const MANAGE_ACCOUNTS_VIEW_ROUTE = 'ManageAccountsView';

/**
 * Renders the presentational view with explicit props. Screen/connector
 * coverage belongs in a follow-up once `ManageAccounts` ships.
 */
interface ViewHarnessOptions {
  fixture: MultichainAccountsFixture;
  isHiddenByGroupId?: Partial<Record<string, boolean>>;
  onToggleHidden?: (groupId: string, nextHidden: boolean) => void;
  onRemoveAccount?: (groupId: string) => void;
  onAddAccount?: (walletName: string) => void;
  onAddWallet?: () => void;
  onBack?: () => void;
  sectionsOverrides?: Partial<ManageAccountsSection>[];
}

const makeViewHarness =
  (options: ViewHarnessOptions): React.ComponentType =>
  () => {
    const {
      fixture,
      isHiddenByGroupId = {},
      onToggleHidden = jest.fn(),
      onRemoveAccount,
      onAddAccount,
      onAddWallet,
      onBack = jest.fn(),
      sectionsOverrides = [],
    } = options;
    const sections: ManageAccountsSection[] = [
      {
        walletName: WALLET_NAME,
        groups: [
          fixture.groups.account1,
          ...(fixture.groups.account2 ? [fixture.groups.account2] : []),
        ],
        ...sectionsOverrides[0],
      },
    ];
    return (
      <ManageAccountsView
        sections={sections}
        isHiddenByGroupId={isHiddenByGroupId}
        onToggleHidden={onToggleHidden}
        onRemoveAccount={onRemoveAccount}
        onAddAccount={onAddAccount}
        onAddWallet={onAddWallet}
        avatarAccountType="Maskicon"
        onBack={onBack}
      />
    );
  };

const renderManageAccountsView = (options: ViewHarnessOptions) =>
  renderComponentViewScreen(
    makeViewHarness(options),
    { name: MANAGE_ACCOUNTS_VIEW_ROUTE },
    { state: options.fixture.state },
  );

describeForPlatforms('ManageAccountsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders wallet sections, section headers and account rows, and hides a visible group on eye press', () => {
    const fixture = buildMultichainAccountsFixture();
    const onToggleHidden = jest.fn();
    const { getByTestId } = renderManageAccountsView({
      fixture,
      onToggleHidden,
    });

    const header = getByTestId(getManageAccountSectionHeaderId(WALLET_NAME));
    const row1 = getByTestId(getManageAccountRowId(ACCOUNT_1_GROUP_ID));
    const row2 = getByTestId(getManageAccountRowId(ACCOUNT_2_GROUP_ID));
    const eye1 = getByTestId(
      getManageAccountRowEyeToggleId(ACCOUNT_1_GROUP_ID),
    );
    expect(eye1.props.accessibilityLabel).toBe('Hide account');
    fireEvent.press(eye1);

    expect(header).toBeOnTheScreen();
    expect(row1).toBeOnTheScreen();
    expect(row2).toBeOnTheScreen();
    expect(
      getByTestId(ManageAccountsViewSelectorsIDs.ACCOUNT_LIST),
    ).toBeOnTheScreen();
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
    expect(onToggleHidden).toHaveBeenCalledWith(ACCOUNT_1_GROUP_ID, true);
  });

  it('renders a hidden group in the eye-slash state and unhides it on eye press', () => {
    const fixture = buildMultichainAccountsFixture();
    const onToggleHidden = jest.fn();
    const { getByTestId, UNSAFE_getByProps } = renderManageAccountsView({
      fixture,
      onToggleHidden,
      isHiddenByGroupId: { [ACCOUNT_2_GROUP_ID]: true },
    });
    // Cell content is excluded from the a11y tree when hidden
    // (accessibilityElementsHidden + no-hide-descendants on the cell wrapper).
    const hiddenEye = getByTestId(
      getManageAccountRowEyeToggleId(ACCOUNT_2_GROUP_ID),
    );

    expect(hiddenEye.props.accessibilityLabel).toBe('Unhide account');
    expect(
      UNSAFE_getByProps({ accessibilityElementsHidden: true }),
    ).toBeTruthy();
    fireEvent.press(hiddenEye);

    expect(
      getByTestId(getManageAccountRowId(ACCOUNT_2_GROUP_ID)),
    ).toBeOnTheScreen();
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
    expect(onToggleHidden).toHaveBeenCalledWith(ACCOUNT_2_GROUP_ID, false);
  });

  it('fires the injected back handler when the back button is pressed', () => {
    const fixture = buildMultichainAccountsFixture();
    const onBack = jest.fn();
    const { getByTestId } = renderManageAccountsView({ fixture, onBack });

    const backButton = getByTestId(ManageAccountsViewSelectorsIDs.BACK_BUTTON);
    fireEvent.press(backButton);

    expect(backButton).toBeOnTheScreen();
    expect(
      getByTestId(ManageAccountsViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders add-account footer and add-wallet CTA when handlers are injected, without header remove', () => {
    const fixture = buildMultichainAccountsFixture();
    const { queryByTestId, getByTestId } = renderManageAccountsView({
      fixture,
      onAddAccount: jest.fn(),
      onAddWallet: jest.fn(),
      sectionsOverrides: [
        {
          walletId: WALLET_ID,
          showsAddAccountFooter: true,
        },
      ],
    });

    expect(
      getByTestId(getManageAccountAddAccountFooterId(WALLET_NAME)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ManageAccountsViewSelectorsIDs.ADD_WALLET_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(getManageAccountSectionHeaderRemoveId(WALLET_NAME)),
    ).toBeNull();
  });

  it('renders the add-wallet CTA and fires the injected handler on press', () => {
    const fixture = buildMultichainAccountsFixture();
    const onAddWallet = jest.fn();
    const { getByTestId } = renderManageAccountsView({ fixture, onAddWallet });

    const addWalletButton = getByTestId(
      ManageAccountsViewSelectorsIDs.ADD_WALLET_BUTTON,
    );
    fireEvent.press(addWalletButton);

    expect(addWalletButton).toBeOnTheScreen();
    expect(onAddWallet).toHaveBeenCalledTimes(1);
  });

  it('renders the add-account footer and section-header remove only when injected per section', () => {
    const fixture = buildMultichainAccountsFixture();
    const onRemoveWallet = jest.fn();
    const onAddAccount = jest.fn();
    const { getByTestId } = renderManageAccountsView({
      fixture,
      onAddAccount,
      sectionsOverrides: [
        {
          walletId: WALLET_ID,
          isLocked: true,
          onRemoveWallet,
          showsAddAccountFooter: true,
        },
      ],
    });

    const addAccountFooter = getByTestId(
      getManageAccountAddAccountFooterId(WALLET_NAME),
    );
    const removeHeaderControl = getByTestId(
      getManageAccountSectionHeaderRemoveId(WALLET_NAME),
    );
    fireEvent.press(removeHeaderControl);

    expect(addAccountFooter).toBeOnTheScreen();
    expect(onRemoveWallet).toHaveBeenCalledTimes(1);
  });

  it('renders eye-only and minus-only rows per the injected trailing variants', () => {
    const fixture = buildMultichainAccountsFixture();
    const onRemoveAccount = jest.fn();
    const onToggleHidden = jest.fn();
    const { getByTestId, queryByTestId } = renderManageAccountsView({
      fixture,
      onToggleHidden,
      onRemoveAccount,
      sectionsOverrides: [
        {
          rowVariantByGroupId: {
            [ACCOUNT_1_GROUP_ID]: ManageAccountRowVariant.Hide,
            [ACCOUNT_2_GROUP_ID]: ManageAccountRowVariant.Remove,
          },
        },
      ],
    });

    fireEvent.press(
      getByTestId(getManageAccountRowEyeToggleId(ACCOUNT_1_GROUP_ID)),
    );

    expect(
      queryByTestId(getManageAccountRowRemoveId(ACCOUNT_1_GROUP_ID)),
    ).toBeNull();
    expect(onToggleHidden).toHaveBeenCalledWith(ACCOUNT_1_GROUP_ID, true);

    fireEvent.press(
      getByTestId(getManageAccountRowRemoveId(ACCOUNT_2_GROUP_ID)),
    );

    expect(
      queryByTestId(getManageAccountRowEyeToggleId(ACCOUNT_2_GROUP_ID)),
    ).toBeNull();
    expect(onRemoveAccount).toHaveBeenCalledTimes(1);
    expect(onRemoveAccount).toHaveBeenCalledWith(ACCOUNT_2_GROUP_ID);
  });
});
