import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MusdRescueRecipientScreen from './MusdRescueRecipientSelector';
import { MusdRescueRecipientTestIds } from './testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useMusdRescueRecipients from '../../hooks/useMusdRescueRecipients';

jest.mock('../../hooks/useMusdRescueRecipients', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../util/assets', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../util/assets'),
  // Deterministic fiat rendering for balance assertions.
  formatWithThreshold: jest.fn(
    (balance: number) => `$${Number(balance).toFixed(2)}`,
  ),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: jest.fn(() => false),
}));

jest.mock('../../../../../selectors/settings', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../selectors/settings'),
  selectAvatarAccountType: jest.fn(() => 'maskicon'),
}));

jest.mock('../../../../../selectors/assets/balances', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../selectors/assets/balances'),
  // No group balances in the test store; rows render without a value.
  selectBalanceByAccountGroup: jest.fn(() => () => undefined),
}));

jest.mock('@shopify/flash-list', () => {
  const { flashListMock } = jest.requireActual(
    '../../../../../util/test/mockFlashList',
  ) as { flashListMock: () => unknown };
  return flashListMock();
});

const mockGoBack = jest.fn();
const mockPopTo = jest.fn();

const mockUseMusdRescueRecipients = useMusdRescueRecipients as jest.Mock;

const RECIPIENT_A = '0x1234567890123456789012345678901234567891';
const RECIPIENT_B = '0x2345678901234567890123456789012345678912';

const RECIPIENTS = [
  {
    id: 'account-1',
    address: RECIPIENT_A,
    name: 'Account 1',
    groupName: 'Group 0',
    groupId: 'entropy:e1/0',
  },
  {
    id: 'account-2',
    address: RECIPIENT_B,
    name: 'Account 2',
    groupName: 'Group 1',
    groupId: 'entropy:e1/1',
  },
];

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      popTo: mockPopTo,
    }),
    useRoute: () => ({
      params: { selectedRecipientId: 'account-1' },
    }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMusdRescueRecipients.mockReturnValue({ recipients: RECIPIENTS });
});

describe('MusdRescueRecipientScreen', () => {
  it('renders the header and every recipient row', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MusdRescueRecipientScreen />,
    );

    expect(getByTestId(MusdRescueRecipientTestIds.CONTAINER)).toBeOnTheScreen();
    expect(
      getByTestId(MusdRescueRecipientTestIds.BACK_BUTTON),
    ).toBeOnTheScreen();
    // Group names are the row titles when present.
    expect(getByText('Group 0')).toBeOnTheScreen();
    expect(getByText('Group 1')).toBeOnTheScreen();
    expect(
      getByTestId(`${MusdRescueRecipientTestIds.ACCOUNT_OPTION}-account-1`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${MusdRescueRecipientTestIds.ACCOUNT_OPTION}-account-2`),
    ).toBeOnTheScreen();
  });

  it('marks the selected recipient from route params', () => {
    const { getByTestId } = renderWithProvider(<MusdRescueRecipientScreen />);

    expect(
      getByTestId(`${MusdRescueRecipientTestIds.ACCOUNT_OPTION}-account-1`)
        .props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      getByTestId(`${MusdRescueRecipientTestIds.ACCOUNT_OPTION}-account-2`)
        .props.accessibilityState?.selected,
    ).toBe(false);
  });

  it('pops back to the review screen with the tapped recipient', () => {
    const { getByTestId } = renderWithProvider(<MusdRescueRecipientScreen />);

    fireEvent.press(
      getByTestId(`${MusdRescueRecipientTestIds.ACCOUNT_OPTION}-account-2`),
    );

    expect(mockPopTo).toHaveBeenCalledWith(
      Routes.MONEY.MUSD_RESCUE_SEND,
      { recipientId: 'account-2' },
      { merge: true },
    );
  });

  it('returns to the review screen on back without changing the selection', () => {
    const { getByTestId } = renderWithProvider(<MusdRescueRecipientScreen />);

    fireEvent.press(getByTestId(MusdRescueRecipientTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockPopTo).not.toHaveBeenCalled();
  });

  it('filters recipients by account name, group name, and address', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <MusdRescueRecipientScreen />,
    );

    // The DS search field renders its own testID; find it by placeholder.
    const search = getByTestId('textfieldsearch').findByProps({
      placeholder: strings('money.musd_rescue_send.recipient_placeholder'),
    });

    fireEvent.changeText(search, 'account 2');
    expect(queryByText('Group 0')).toBeNull();
    expect(queryByText('Group 1')).toBeOnTheScreen();

    // Group name is searchable (row titles show the group name when set).
    fireEvent.changeText(search, 'Group 0');
    expect(queryByText('Group 0')).toBeOnTheScreen();
    expect(queryByText('Group 1')).toBeNull();

    fireEvent.changeText(search, RECIPIENT_B);
    expect(queryByText('Group 1')).toBeOnTheScreen();
  });

  it('shows the empty state when nothing matches the query', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <MusdRescueRecipientScreen />,
    );

    const search = getByTestId('textfieldsearch').findByProps({
      placeholder: strings('money.musd_rescue_send.recipient_placeholder'),
    });
    fireEvent.changeText(search, 'no match');

    expect(
      getByTestId(MusdRescueRecipientTestIds.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(queryByText('Group 0')).toBeNull();
  });

  it('shows the empty state when there are no eligible recipients', () => {
    mockUseMusdRescueRecipients.mockReturnValue({ recipients: [] });

    const { getByTestId } = renderWithProvider(<MusdRescueRecipientScreen />);

    expect(
      getByTestId(MusdRescueRecipientTestIds.EMPTY_STATE),
    ).toBeOnTheScreen();
  });
});
