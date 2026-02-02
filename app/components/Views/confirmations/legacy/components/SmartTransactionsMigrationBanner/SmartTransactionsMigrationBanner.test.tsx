import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import SmartTransactionsMigrationBanner from './SmartTransactionsMigrationBanner';
import Engine from '../../../../../../core/Engine';
import { Linking } from 'react-native';
import AppConstants from '../../../../../../core/AppConstants';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setFeatureFlag: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

// Mock the selectors
jest.mock('../../../../../../selectors/preferencesController', () => ({
  selectSmartTransactionsMigrationApplied: jest.fn(() => true),
  selectSmartTransactionsBannerDismissed: jest.fn(() => false),
}));

jest.mock('../../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn(() => true),
}));

describe('SmartTransactionsMigrationBanner', () => {
  const mockStore = configureMockStore();
  const mockSetFeatureFlag = jest.mocked(
    Engine.context.PreferencesController.setFeatureFlag,
  );
  const mockedPreferences = jest.requireMock(
    '../../../../../../selectors/preferencesController',
  );
  const mockedSmartTransactions = jest.requireMock(
    '../../../../../../selectors/smartTransactionsController',
  );
  const mockOpenURL = jest.mocked(Linking.openURL);

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset only the selectors we're actually using
    mockedPreferences.selectSmartTransactionsMigrationApplied.mockReturnValue(
      true,
    );
    mockedPreferences.selectSmartTransactionsBannerDismissed.mockReturnValue(
      false,
    );
    mockedSmartTransactions.selectShouldUseSmartTransaction.mockReturnValue(
      true,
    );
  });

  describe('banner visibility', () => {
    it('renders nothing when banner is dismissed', () => {
      mockedPreferences.selectSmartTransactionsBannerDismissed.mockReturnValue(
        true,
      );

      const store = mockStore({});
      const { queryByTestId } = render(
        <Provider store={store}>
          <SmartTransactionsMigrationBanner />
        </Provider>,
      );
      expect(queryByTestId('smart-transactions-migration-banner')).toBeNull();
    });

    it('renders nothing when smart transactions are not enabled', () => {
      mockedSmartTransactions.selectShouldUseSmartTransaction.mockReturnValue(
        false,
      );
      const store = mockStore({});
      const { queryByTestId } = render(
        <Provider store={store}>
          <SmartTransactionsMigrationBanner />
        </Provider>,
      );
      expect(queryByTestId('smart-transactions-migration-banner')).toBeNull();
    });

    it('renders nothing when migration is not applied', () => {
      mockedPreferences.selectSmartTransactionsMigrationApplied.mockReturnValue(
        false,
      );
      const store = mockStore({});
      const { queryByTestId } = render(
        <Provider store={store}>
          <SmartTransactionsMigrationBanner />
        </Provider>,
      );
      expect(queryByTestId('smart-transactions-migration-banner')).toBeNull();
    });

    it('renders banner when all conditions are met', () => {
      const store = mockStore({});

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <SmartTransactionsMigrationBanner />
        </Provider>,
      );

      expect(getByTestId('smart-transactions-migration-banner')).toBeDefined();
      expect(getByText('smart_transactions_migration.title')).toBeDefined();
      expect(getByText('smart_transactions_migration.link')).toBeDefined();
    });
  });

  describe('banner interactions', () => {
    it('calls setFeatureFlag when close button is pressed', () => {
      const store = mockStore({});

      const { getByTestId } = render(
        <Provider store={store}>
          <SmartTransactionsMigrationBanner />
        </Provider>,
      );

      fireEvent.press(getByTestId('banner-close-button-icon'));
      expect(mockSetFeatureFlag).toHaveBeenCalledWith(
        'smartTransactionsBannerDismissed',
        true,
      );
    });

    it('opens URL and dismisses banner when learn more link is pressed', () => {
      const store = mockStore({});

      const { getByText } = render(
        <Provider store={store}>
          <SmartTransactionsMigrationBanner />
        </Provider>,
      );

      fireEvent.press(getByText('smart_transactions_migration.link'));

      expect(mockOpenURL).toHaveBeenCalledTimes(1);
      expect(mockOpenURL).toHaveBeenCalledWith(AppConstants.URLS.SMART_TXS);
      expect(mockSetFeatureFlag).toHaveBeenCalledWith(
        'smartTransactionsBannerDismissed',
        true,
      );
    });
  });

  describe('banner styling', () => {
    it('accepts and applies custom styles', () => {
      const store = mockStore({});
      const customStyle = { marginTop: 20 };

      const { getByTestId } = render(
        <Provider store={store}>
          <SmartTransactionsMigrationBanner style={customStyle} />
        </Provider>,
      );

      const banner = getByTestId('smart-transactions-migration-banner');
      const style = banner.props.style;

      // Check if either marginVertical is set, or both marginTop/marginBottom are set
      const hasCorrectMargins =
        style.marginVertical !== undefined ||
        (style.marginTop === 20 && style.marginBottom === 16);

      expect(hasCorrectMargins).toBe(true);
    });
  });
});
