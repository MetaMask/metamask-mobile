import '../../../../../../tests/component-view/mocks';
import { waitFor } from '@testing-library/react-native';
import React from 'react';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { renderComponentViewScreen } from '../../../../../../tests/component-view/render';
import { createStateFixture } from '../../../../../../tests/component-view/stateFixture';
import CreateVirtualBankAccount from './CreateVirtualBankAccount';
import { strings } from '../../../../../../locales/i18n';
import { getMoneyAccountDepositAssetId } from '../../../Money/utils/moneyAccountTransactions';

const mockGetPaymentMethodsForContext = jest.mocked(
  Engine.context.RampsController.getPaymentMethodsForContext,
);

const manualBankTransfer = {
  id: '/payments/bank-transfer',
  paymentType: 'bank-transfer',
  name: 'Bank transfer',
  score: 1,
  icon: 'bank',
  isManualBankTransfer: true,
  delay: [2880, 4320],
};

const disclaimer = {
  id: 'd-1',
  url: 'https://moonpay.example/terms',
  display_name: "MoonPay's Terms and Conditions",
};

/**
 * Renders the intro screen with real hooks and selectors; only Engine is
 * mocked (per the component-view rules). The geolocation location drives
 * `useVbaEligibility`, and the payment-methods spy drives the arrival row.
 */
const renderScreen = ({ location }: { location?: string } = {}) => {
  const state = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withRemoteFeatureFlags({})
    .withOverrides({
      engine: {
        backgroundState: {
          GeolocationController: { location },
        },
      },
    })
    .build();

  return renderComponentViewScreen(
    CreateVirtualBankAccount as unknown as React.ComponentType,
    { name: Routes.RAMP.VBA_ONBOARDING },
    { state },
  );
};

describe('CreateVirtualBankAccount view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // `useKycDisclaimers` is real in view tests; give it deterministic data.
    (Engine.context as Record<string, unknown>).KycService = {
      getGeoCountry: jest.fn().mockResolvedValue('BR'),
    };
    (Engine.context as Record<string, unknown>).KycController = {
      fetchVendorDisclaimers: jest.fn().mockResolvedValue([disclaimer]),
    };
    mockGetPaymentMethodsForContext.mockResolvedValue({
      methods: [manualBankTransfer as never],
      selected: null,
      providerIds: [],
    });
  });

  it('shows the live arrival timeframe and queries the catalog for the VBA region', async () => {
    const { getByText } = renderScreen({ location: 'BR' });

    const liveTitle = strings(
      'virtual_bank_account.create_virtual_bank_account.feature_arrives_title',
      { timeframe: '2 - 3 business days' },
    );
    await waitFor(() => {
      expect(getByText(liveTitle)).toBeOnTheScreen();
    });

    expect(mockGetPaymentMethodsForContext).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'br',
        // The query pipeline normalizes the CAIP asset id to lowercase.
        assetId: getMoneyAccountDepositAssetId().toLowerCase(),
        autoSelectProvider: true,
        restrictToKnownOrNativeProviders: true,
        updateState: false,
      }),
    );
    expect(
      getByText(
        strings(
          'virtual_bank_account.create_virtual_bank_account.feature_arrives_description',
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('queries the country-level region code for a country-state geolocation', async () => {
    renderScreen({ location: 'BR-SP' });

    await waitFor(() => {
      expect(mockGetPaymentMethodsForContext).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'br' }),
      );
    });
  });

  it('keeps the fallback arrival copy and never fetches outside VBA regions', async () => {
    const { getByText } = renderScreen({ location: 'PT' });

    const fallbackTitle = strings(
      'virtual_bank_account.create_virtual_bank_account.feature_arrives_title_no_timeframe',
    );
    await waitFor(() => {
      expect(getByText(fallbackTitle)).toBeOnTheScreen();
    });

    expect(mockGetPaymentMethodsForContext).not.toHaveBeenCalled();
  });

  it('falls back to static copy when the payment-methods fetch rejects', async () => {
    mockGetPaymentMethodsForContext.mockRejectedValue(
      new Error('catalog unavailable'),
    );
    const { getByText, queryByText } = renderScreen({ location: 'BR' });

    await waitFor(() => {
      expect(
        getByText(
          strings(
            'virtual_bank_account.create_virtual_bank_account.feature_arrives_title_no_timeframe',
          ),
        ),
      ).toBeOnTheScreen();
    });
    expect(queryByText(/timeframe by region/)).toBeNull();
  });

  it('falls back to static copy when the resolved methods have no delay pair', async () => {
    mockGetPaymentMethodsForContext.mockResolvedValue({
      methods: [{ ...manualBankTransfer, delay: undefined } as never],
      selected: null,
      providerIds: [],
    });
    const { getByText, queryByText } = renderScreen({ location: 'BR' });

    await waitFor(() => {
      expect(mockGetPaymentMethodsForContext).toHaveBeenCalled();
    });

    expect(
      getByText(
        strings(
          'virtual_bank_account.create_virtual_bank_account.feature_arrives_title_no_timeframe',
        ),
      ),
    ).toBeOnTheScreen();
    expect(queryByText(/timeframe by region/)).toBeNull();
  });
});
