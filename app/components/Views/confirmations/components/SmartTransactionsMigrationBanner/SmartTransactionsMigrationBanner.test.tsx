import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import SmartTransactionsMigrationBanner from './SmartTransactionsMigrationBanner';
import Engine from '../../../../../core/Engine';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setFeatureFlag: jest.fn(),
    },
  },
}));

// Mock the selectors
jest.mock('../../../../../selectors/preferencesController', () => ({
  selectSmartTransactionsMigrationApplied: jest.fn(() => true),
  selectSmartTransactionsBannerDismissed: jest.fn(() => false),
  selectSmartTransactionsOptInStatus: jest.fn(() => true),
}));

jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  selectSmartTransactionsEnabled: jest.fn(() => true),
  selectShouldUseSmartTransaction: jest.fn(() => true),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

describe('SmartTransactionsMigrationBanner', () => {
  const mockStore = configureMockStore();
  const mockSetFeatureFlag = jest.mocked(Engine.context.PreferencesController.setFeatureFlag);
  const mockedPreferences = jest.requireMock('../../../../../selectors/preferencesController');
  const mockedSmartTransactions = jest.requireMock('../../../../../selectors/smartTransactionsController');

  const createMockState = () => ({
    engine: {
      backgroundState: {
        PreferencesController: {}
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all selector mocks to their default values
    mockedPreferences.selectSmartTransactionsMigrationApplied.mockReturnValue(true);
    mockedPreferences.selectSmartTransactionsBannerDismissed.mockReturnValue(false);
    mockedPreferences.selectSmartTransactionsOptInStatus.mockReturnValue(true);
    mockedSmartTransactions.selectSmartTransactionsEnabled.mockReturnValue(true);
    mockedSmartTransactions.selectShouldUseSmartTransaction.mockReturnValue(true);
  });

  it('renders nothing when banner should be hidden', () => {
    mockedPreferences.selectSmartTransactionsBannerDismissed.mockReturnValue(true);

    const store = mockStore(createMockState());
    const { queryByTestId } = render(
      <Provider store={store}>
        <SmartTransactionsMigrationBanner />
      </Provider>
    );
    expect(queryByTestId('smart-transactions-migration-banner')).toBeNull();
  });

  it('renders banner when conditions are met', () => {
    const store = mockStore(createMockState());

    const { getByTestId, getByText } = render(
      <Provider store={store}>
        <SmartTransactionsMigrationBanner />
      </Provider>
    );

    expect(getByTestId('smart-transactions-migration-banner')).toBeDefined();
    expect(getByText('smart_transactions_migration.title')).toBeDefined();
    expect(getByText('smart_transactions_migration.link')).toBeDefined();
  });

  it('calls setFeatureFlag when close button is pressed', () => {
    const store = mockStore(createMockState());

    const { getByTestId } = render(
      <Provider store={store}>
        <SmartTransactionsMigrationBanner />
      </Provider>
    );

    fireEvent.press(getByTestId('banner-close-button-icon'));
    expect(mockSetFeatureFlag).toHaveBeenCalledWith(
      'smartTransactionsBannerDismissed',
      true,
    );
  });

  it('accepts and applies custom styles', () => {
    const store = mockStore(createMockState());
    const customStyle = { marginTop: 20 };

    const { getByTestId } = render(
      <Provider store={store}>
        <SmartTransactionsMigrationBanner style={customStyle} />
      </Provider>
    );

    const banner = getByTestId('smart-transactions-migration-banner');
    expect(banner.props.style).toMatchObject(expect.objectContaining(customStyle));
  });
});
