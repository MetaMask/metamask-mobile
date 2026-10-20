import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderVbaVendorTerms,
  renderVbaVendorTermsWithCaller,
  restoreVbaReduxServiceStore,
  VbaRendererTestIds,
} from '../../../../../../tests/component-view/renderers/vba';
import { strings } from '../../../../../../locales/i18n';
import { getMoneyAccountDepositAssetId } from '../../../Money/utils/moneyAccountTransactions';
import { CreateVirtualBankAccountSelectorsIDs } from './CreateVirtualBankAccount.testIds';
import { VbaOnboardingRoutes } from './routes';

const mockGetPaymentMethodsForContext = jest.mocked(
  Engine.context.RampsController.getPaymentMethodsForContext,
);
const mockHydrateVbaOnboarding = jest.mocked(
  Engine.context.RampsController.hydrateVbaOnboarding,
);
const mockFetchVendorDisclaimers = jest.mocked(
  Engine.context.KycController.fetchVendorDisclaimers,
);
const kycService = Engine.context.KycService;
if (!kycService) {
  throw new Error('Component view Engine mock must provide KycService');
}
const mockGetGeoCountry = jest.mocked(kycService.getGeoCountry);

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

describeForPlatforms('CreateVirtualBankAccount view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGeoCountry.mockResolvedValue('BR');
    mockFetchVendorDisclaimers.mockResolvedValue([disclaimer]);
    mockHydrateVbaOnboarding.mockResolvedValue({
      sessionExists: false,
      vendorDisclaimersComplete: false,
      sessionDisclaimersComplete: false,
      providerFlowStatus: 'not_started',
      kycStatus: 'none',
      autorampStatus: 'not_ready',
    });
    mockGetPaymentMethodsForContext.mockResolvedValue({
      methods: [manualBankTransfer as never],
      selected: null,
      providerIds: [],
    });
  });

  afterEach(() => {
    restoreVbaReduxServiceStore();
  });

  it('shows the live arrival timeframe and queries the catalog for the VBA region', async () => {
    const { getByText } = renderVbaVendorTerms({ location: 'BR' });

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
    renderVbaVendorTerms({ location: 'BR-SP' });

    await waitFor(() => {
      expect(mockGetPaymentMethodsForContext).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'br' }),
      );
    });
  });

  it('keeps the fallback arrival copy and never fetches outside VBA regions', async () => {
    const { getByText } = renderVbaVendorTerms({ location: 'PT' });

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
    const { getByText, queryByText } = renderVbaVendorTerms({
      location: 'BR',
    });

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
    const { getByText, queryByText } = renderVbaVendorTerms({
      location: 'BR',
    });

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

  it('accepts vendor terms and advances to email', async () => {
    const { findByTestId, getByTestId } = renderVbaVendorTerms();
    const continueButton = getByTestId(
      CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
    );
    await waitFor(() => expect(continueButton).toBeEnabled());

    fireEvent.press(continueButton);

    expect(
      await findByTestId(
        getRouteProbeTestId(VbaOnboardingRoutes.EMAIL),
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();
    expect(mockHydrateVbaOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshKyc: true,
        refreshAutoramps: true,
      }),
    );
  });

  it('opens the generic error route when continuing vendor terms fails', async () => {
    mockHydrateVbaOnboarding.mockRejectedValue(new Error('hydrate failed'));
    const { findByTestId, getByTestId, queryByTestId } = renderVbaVendorTerms();
    const continueButton = getByTestId(
      CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
    );
    await waitFor(() => expect(continueButton).toBeEnabled());

    fireEvent.press(continueButton);

    expect(
      await findByTestId(
        getRouteProbeTestId(VbaOnboardingRoutes.ERROR),
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('retries loading vendor disclaimers after a request failure', async () => {
    mockFetchVendorDisclaimers
      .mockRejectedValueOnce(new Error('catalog unavailable'))
      .mockResolvedValueOnce([disclaimer]);
    const { findByTestId } = renderVbaVendorTerms();
    fireEvent.press(
      await findByTestId(
        CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_RETRY,
      ),
    );

    expect(
      await findByTestId(
        `${CreateVirtualBankAccountSelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`,
      ),
    ).toBeOnTheScreen();
    expect(mockFetchVendorDisclaimers).toHaveBeenCalledTimes(2);
  });

  it('returns to the caller from the vendor terms back button', async () => {
    const { getByTestId, findByTestId } = renderVbaVendorTermsWithCaller();
    fireEvent.press(getByTestId(VbaRendererTestIds.OPEN_VENDOR_TERMS));
    await findByTestId(CreateVirtualBankAccountSelectorsIDs.CONTAINER);

    fireEvent.press(
      getByTestId(CreateVirtualBankAccountSelectorsIDs.BACK_BUTTON),
    );

    expect(await findByTestId(VbaRendererTestIds.CALLER)).toBeOnTheScreen();
  });
});
