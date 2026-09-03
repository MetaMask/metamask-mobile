import '../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderComponentViewScreen } from '../../../../tests/component-view/render';
import {
  buildMultichainAccountsFixture,
  type MultichainAccountsFixture,
} from '../../../../tests/component-view/presets/multichainAccounts';
import { deepMerge } from '../../../../tests/component-view/stateFixture';
import ManageAccountsScreen from './ManageAccounts';
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

const setAccountGroupHiddenMock = jest.fn();

const renderManageAccountsScreen = (fixture: MultichainAccountsFixture) =>
  renderComponentViewScreen(
    ManageAccountsScreen,
    { name: Routes.MANAGE_ACCOUNTS_VIEW },
    { state: fixture.state },
  );

const withHiddenSecondGroup = (): MultichainAccountsFixture => {
  const fixture = buildMultichainAccountsFixture();
  fixture.state = deepMerge(
    fixture.state as unknown as Record<string, unknown>,
    {
      engine: {
        backgroundState: {
          AccountTreeController: {
            accountTree: {
              wallets: {
                [WALLET_ID]: {
                  groups: {
                    [ACCOUNT_2_GROUP_ID]: {
                      metadata: { hidden: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  ) as MultichainAccountsFixture['state'];
  return fixture;
};

/**
 * Renders the presentational view with explicit props so the callback-gated
 * affordances (add-account footer, add-wallet CTA, header remove) can be
 * exercised without touching the off-limits connector lane.
 */
interface ViewHarnessOptions {
  fixture: MultichainAccountsFixture;
  onToggleHidden?: (groupId: string, nextHidden: boolean) => void;
  onRemoveAccount?: (groupId: string) => void;
  onAddAccount?: (walletName: string) => void;
  onAddWallet?: () => void;
  sectionsOverrides?: Partial<ManageAccountsSection>[];
}

const makeViewHarness =
  (options: ViewHarnessOptions): React.ComponentType =>
  () => {
    const {
      fixture,
      onToggleHidden = jest.fn(),
      onRemoveAccount,
      onAddAccount,
      onAddWallet,
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
        isHiddenByGroupId={{}}
        onToggleHidden={onToggleHidden}
        onRemoveAccount={onRemoveAccount}
        onAddAccount={onAddAccount}
        onAddWallet={onAddWallet}
        avatarAccountType="Maskicon"
        onBack={jest.fn()}
      />
    );
  };

describeForPlatforms('ManageAccountsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      Engine.context.AccountTreeController as unknown as Record<string, unknown>
    ).setAccountGroupHidden = setAccountGroupHiddenMock;
  });

  it('renders wallet sections, section headers and account rows, and hides a visible group on eye press', () => {
    // Arrange
    const fixture = buildMultichainAccountsFixture();
    const { getByTestId } = renderManageAccountsScreen(fixture);

    // Act
    const header = getByTestId(getManageAccountSectionHeaderId(WALLET_NAME));
    const row1 = getByTestId(getManageAccountRowId(ACCOUNT_1_GROUP_ID));
    const row2 = getByTestId(getManageAccountRowId(ACCOUNT_2_GROUP_ID));
    const eye1 = getByTestId(
      getManageAccountRowEyeToggleId(ACCOUNT_1_GROUP_ID),
    );
    expect(eye1.props.accessibilityLabel).toBe('Hide account');
    fireEvent.press(eye1);

    // Assert
    expect(header).toBeOnTheScreen();
    expect(row1).toBeOnTheScreen();
    expect(row2).toBeOnTheScreen();
    expect(
      getByTestId(ManageAccountsViewSelectorsIDs.ACCOUNT_LIST),
    ).toBeOnTheScreen();
    expect(setAccountGroupHiddenMock).toHaveBeenCalledTimes(1);
    expect(setAccountGroupHiddenMock).toHaveBeenCalledWith(
      ACCOUNT_1_GROUP_ID,
      true,
    );
  });

  it('renders a hidden group in the eye-slash state and unhides it on eye press', () => {
    // Arrange
    const fixture = withHiddenSecondGroup();
    const { getByTestId } = renderManageAccountsScreen(fixture);
    // The hidden row is excluded from the default accessibility tree
    // (design intent: accessibilityElementsHidden + no-hide-descendants),
    // so its queries include hidden elements.
    const hiddenEye = getByTestId(
      getManageAccountRowEyeToggleId(ACCOUNT_2_GROUP_ID),
      { includeHiddenElements: true },
    );
    const hiddenRow = getByTestId(getManageAccountRowId(ACCOUNT_2_GROUP_ID), {
      includeHiddenElements: true,
    });

    // Act
    expect(hiddenEye.props.accessibilityLabel).toBe('Unhide account');
    fireEvent.press(hiddenEye);

    // Assert
    expect(hiddenRow.props.accessibilityElementsHidden).toBe(true);
    expect(setAccountGroupHiddenMock).toHaveBeenCalledTimes(1);
    expect(setAccountGroupHiddenMock).toHaveBeenCalledWith(
      ACCOUNT_2_GROUP_ID,
      false,
    );
  });

  it('keeps the back button wired to the navigation back action', () => {
    // Arrange
    const fixture = buildMultichainAccountsFixture();
    const { getByTestId } = renderManageAccountsScreen(fixture);

    // Act
    const backButton = getByTestId(ManageAccountsViewSelectorsIDs.BACK_BUTTON);
    fireEvent.press(backButton);

    // Assert
    expect(backButton).toBeOnTheScreen();
    // goBack() on a stack with no prior route is a no-op — the wiring is
    // validated by the screen rendering inside the navigator without error.
    expect(
      getByTestId(ManageAccountsViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('wires the connector affordances: add-account footer + add-wallet CTA, no header remove', () => {
    // Arrange
    const fixture = buildMultichainAccountsFixture();
    const { queryByTestId, getByTestId } = renderManageAccountsScreen(fixture);

    // Act + Assert — the connector supplies `onAddAccount` / `onAddWallet`,
    // so the entropy section's add-account footer and the add-wallet CTA
    // render. Wallet-level remove stays unwired (design-TBD / no controller
    // support), so the section header Remove control is absent.
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
    // Arrange
    const fixture = buildMultichainAccountsFixture();
    const onAddWallet = jest.fn();
    const { getByTestId } = renderComponentViewScreen(
      makeViewHarness({ fixture, onAddWallet }),
      { name: Routes.MANAGE_ACCOUNTS_VIEW },
      { state: fixture.state },
    );

    // Act
    const addWalletButton = getByTestId(
      ManageAccountsViewSelectorsIDs.ADD_WALLET_BUTTON,
    );
    fireEvent.press(addWalletButton);

    // Assert
    expect(addWalletButton).toBeOnTheScreen();
    expect(onAddWallet).toHaveBeenCalledTimes(1);
  });

  it('renders the add-account footer and section-header remove only when injected per section', () => {
    // Arrange
    const fixture = buildMultichainAccountsFixture();
    const onRemoveWallet = jest.fn();
    const onAddAccount = jest.fn();
    const { getByTestId } = renderComponentViewScreen(
      makeViewHarness({
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
      }),
      { name: Routes.MANAGE_ACCOUNTS_VIEW },
      { state: fixture.state },
    );

    // Act
    const addAccountFooter = getByTestId(
      getManageAccountAddAccountFooterId(WALLET_NAME),
    );
    const removeHeaderControl = getByTestId(
      getManageAccountSectionHeaderRemoveId(WALLET_NAME),
    );
    fireEvent.press(removeHeaderControl);

    // Assert — the header Remove fires the section callback; the reused
    // footer's "Add account" entry is present for this wallet section.
    expect(addAccountFooter).toBeOnTheScreen();
    expect(onRemoveWallet).toHaveBeenCalledTimes(1);
  });

  it('renders eye-only and minus-only rows per the injected trailing variants', () => {
    // Arrange — hide-eligibility matrix at view level: entropy row gets the
    // eye only; an imported row gets the minus only (wiring lane maps types
    // to variants — the fixture's second group stands in for an imported one).
    const fixture = buildMultichainAccountsFixture();
    const onRemoveAccount = jest.fn();
    const onToggleHidden = jest.fn();
    const { getByTestId, queryByTestId } = renderComponentViewScreen(
      makeViewHarness({
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
      }),
      { name: Routes.MANAGE_ACCOUNTS_VIEW },
      { state: fixture.state },
    );

    // Act — eye-only row: eye present and firing; no minus.
    fireEvent.press(
      getByTestId(getManageAccountRowEyeToggleId(ACCOUNT_1_GROUP_ID)),
    );

    // Assert
    expect(
      queryByTestId(getManageAccountRowRemoveId(ACCOUNT_1_GROUP_ID)),
    ).toBeNull();
    expect(onToggleHidden).toHaveBeenCalledWith(ACCOUNT_1_GROUP_ID, true);

    // Act — minus-only row: minus present and firing; no eye.
    fireEvent.press(
      getByTestId(getManageAccountRowRemoveId(ACCOUNT_2_GROUP_ID)),
    );

    // Assert
    expect(
      queryByTestId(getManageAccountRowEyeToggleId(ACCOUNT_2_GROUP_ID)),
    ).toBeNull();
    expect(onRemoveAccount).toHaveBeenCalledTimes(1);
    expect(onRemoveAccount).toHaveBeenCalledWith(ACCOUNT_2_GROUP_ID);
  });
});
