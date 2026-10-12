import { fireEvent, renderHook } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { useNativeHeader } from '../../../../hooks/useNativeHeader';
import { useAccountsMenuAttention } from '../../../../hooks/useAccountsMenuAttention';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';
import {
  formatInterimAccountName,
  useWalletHeaderNativeHeader,
  type WalletHeaderNativeHeaderParams,
} from './useWalletHeaderNativeHeader';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../hooks/useNativeHeader', () => ({
  useNativeHeader: jest.fn(() => true),
}));

jest.mock('../../../../hooks/useAccountsMenuAttention', () => ({
  useAccountsMenuAttention: jest.fn(() => false),
}));

const params: WalletHeaderNativeHeaderParams = {
  displayName: 'Account 1',
  isMoneyAccountVisible: true,
  handleActivityPress: jest.fn(),
  handleSearchPress: jest.fn(),
  handleHamburgerPress: jest.fn(),
  touchAreaSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  isEnabled: true,
};

const renderNativeHeader = (
  overrides: Partial<WalletHeaderNativeHeaderParams> = {},
) => {
  renderHook(() => useWalletHeaderNativeHeader({ ...params, ...overrides }));
  const config = jest.mocked(useNativeHeader).mock.calls.at(-1)?.[0];
  return {
    isEnabled: config?.isEnabled,
    leftItems: config?.leftItems?.() ?? [],
    rightItems: config?.rightItems?.() ?? [],
  };
};

describe('formatInterimAccountName', () => {
  it('truncates names longer than 12 characters', () => {
    expect(formatInterimAccountName('Test Main Account a really long')).toBe(
      'Test Main Ac...',
    );
  });

  it('keeps names of 12 characters or fewer intact', () => {
    expect(formatInterimAccountName('Account 12AB')).toBe('Account 12AB');
  });

  it('never splits an emoji', () => {
    expect(formatInterimAccountName('🦊🦊🦊🦊🦊🦊🦊🦊🦊🦊🦊🦊🦊')).toBe(
      '🦊🦊🦊🦊🦊🦊🦊🦊🦊🦊🦊🦊...',
    );
  });
});

describe('useWalletHeaderNativeHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAccountsMenuAttention).mockReturnValue(false);
  });

  it('passes the screen gate through', () => {
    expect(renderNativeHeader({ isEnabled: false }).isEnabled).toBe(false);
  });

  const renderRightItem = (
    overrides: Partial<WalletHeaderNativeHeaderParams> = {},
  ) => {
    const { rightItems } = renderNativeHeader(overrides);
    expect(rightItems).toHaveLength(1);
    const [actionsItem] = rightItems;
    if (actionsItem?.type !== 'custom') {
      throw new Error('Expected one custom actions item');
    }
    return renderWithProvider(actionsItem.element);
  };

  it('shows Activity, Search and Menu in one row when Money is available', () => {
    const { getByTestId } = renderRightItem();

    expect(
      getByTestId(WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON),
    ).toBeOnTheScreen();
  });

  it('drops Activity when Money is geo-fenced', () => {
    const { queryByTestId } = renderRightItem({ isMoneyAccountVisible: false });

    expect(
      queryByTestId(WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('wires each button to its handler', () => {
    const { getByTestId } = renderRightItem();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON));
    fireEvent.press(getByTestId(WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON));
    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON),
    );

    expect(params.handleActivityPress).toHaveBeenCalledTimes(1);
    expect(params.handleSearchPress).toHaveBeenCalledTimes(1);
    expect(params.handleHamburgerPress).toHaveBeenCalledTimes(1);
  });

  it('badges Menu only when the accounts menu needs attention', () => {
    expect(
      renderRightItem().queryByTestId(
        WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BADGE,
      ),
    ).not.toBeOnTheScreen();

    jest.mocked(useAccountsMenuAttention).mockReturnValue(true);

    expect(
      renderRightItem().getByTestId(
        WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BADGE,
      ),
    ).toBeOnTheScreen();
  });

  it('renders a truncated account picker that opens the account selector', () => {
    const [accountItem] = renderNativeHeader({
      displayName: 'Test Main Account a really long',
    }).leftItems;
    if (accountItem?.type !== 'custom') {
      throw new Error('Expected a custom account picker item');
    }

    const { getByTestId, getByText } = renderWithProvider(accountItem.element);
    fireEvent.press(getByTestId(WalletViewSelectorsIDs.ACCOUNT_ICON));

    expect(getByText('Test Main Ac...')).toBeOnTheScreen();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR,
      {},
    );
  });
});
