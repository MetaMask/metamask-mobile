import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { TokenSortBottomSheet, getSortOption } from './TokenSortBottomSheet';
import Engine from '../../../../core/Engine';
import { selectTokenSortConfig } from '../../../../selectors/preferencesController';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: () => true,
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setTokenSortConfig: jest.fn(),
    },
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const BALANCE_DESC = {
  key: 'tokenFiatAmount',
  order: 'dsc',
  sortCallback: 'stringNumeric',
};

describe('TokenSortBottomSheet', () => {
  const mockSortConfig = (config: Record<string, string> = BALANCE_DESC) => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector === selectTokenSortConfig ? config : null,
    );
  };

  const renderSheet = () => render(<TokenSortBottomSheet />);

  beforeEach(() => {
    jest.clearAllMocks();
    mockSortConfig();
  });

  it('renders the title, both options, Reset and Apply', () => {
    const { getByTestId, getByText } = renderSheet();

    expect(getByTestId(WalletViewSelectorsIDs.SORT_BY)).toBeTruthy();
    expect(
      getByTestId(WalletViewSelectorsIDs.SORT_DECLINING_BALANCE),
    ).toBeTruthy();
    expect(getByTestId(WalletViewSelectorsIDs.SORT_ALPHABETICAL)).toBeTruthy();
    expect(getByText('wallet.sort_reset')).toBeTruthy();
    expect(getByText('wallet.sort_apply')).toBeTruthy();
  });

  it('shows the direction label only on the selected option', () => {
    const { getByText, queryByText } = renderSheet();

    expect(getByText('wallet.sort_high_to_low')).toBeTruthy();
    expect(queryByText('wallet.sort_a_to_z')).toBeNull();
  });

  it('flips the direction when the selected option is pressed again', () => {
    const { getByTestId, getByText } = renderSheet();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_DECLINING_BALANCE));

    expect(getByText('wallet.sort_low_to_high')).toBeTruthy();
  });

  it('selects a new option with its default direction', () => {
    const { getByTestId, getByText } = renderSheet();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_ALPHABETICAL));

    expect(getByText('wallet.sort_a_to_z')).toBeTruthy();
  });

  it('does not save anything until Apply is pressed', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_ALPHABETICAL));

    expect(
      Engine.context.PreferencesController.setTokenSortConfig,
    ).not.toHaveBeenCalled();
  });

  it('saves the draft sort when Apply is pressed', async () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_ALPHABETICAL));
    fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_APPLY));

    await waitFor(() => {
      expect(
        Engine.context.PreferencesController.setTokenSortConfig,
      ).toHaveBeenCalledWith({
        key: 'name',
        order: 'asc',
        sortCallback: 'alphaNumeric',
      });
    });
  });

  it('pops the route when Apply is pressed', async () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_APPLY));

    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  });

  it('restores the default sort in the draft when Reset is pressed', async () => {
    mockSortConfig({
      key: 'name',
      order: 'dsc',
      sortCallback: 'alphaNumeric',
    });
    const { getByTestId } = renderSheet();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_RESET));
    fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_APPLY));

    await waitFor(() => {
      expect(
        Engine.context.PreferencesController.setTokenSortConfig,
      ).toHaveBeenCalledWith(BALANCE_DESC);
    });
  });

  describe('getSortOption', () => {
    it('returns balance for the balance key', () => {
      expect(getSortOption({ key: 'tokenFiatAmount' }).id).toBe('balance');
    });

    it('treats any other key as name', () => {
      expect(getSortOption({ key: 'symbol' }).id).toBe('name');
    });
  });
});
