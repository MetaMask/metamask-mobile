import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { Linking } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  AutorampStatus,
  buildMusdAutorampRequest,
  WalletRegistrationError,
  type AutorampAccount,
  type AutorampDepositInstructions,
} from '@metamask/ramps-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { strings } from '../../../../../../locales/i18n';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import ReduxService, { type ReduxStore } from '../../../../../core/redux';
import { buildSupportUrl } from '../../../../../util/support';
import SupportConsentSheet from '../../../SupportConsentSheet';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderScreenWithRoutes } from '../../../../../../tests/component-view/render';
import {
  initialStateVba,
  VBA_TEST_MONEY_ADDRESS,
} from '../../../../../../tests/component-view/presets/vba';
import { MONEY_MOVEMENT_NEOBANK_FLAG_KEY } from '../../../../../selectors/featureFlagController/moneyAccount';
import VbaOnboardingNavigator from './VbaOnboardingNavigator';
import VbaDetails, { VbaDetailsSelectorsIDs } from './VbaDetails';
import { VbaAccountCreateErrorSelectorsIDs } from './VbaAccountCreateError';
import { resetMusdAutorampSetupGuard } from './ensureMusdAutoramp';
import { clearCachedDepositInstructions } from './vbaDepositInstructionsCache';
import { buildAccountCreateSupportUrl } from './accountCreateError';

const SUPPORT_CONSENT_SHEET_TEST_ID = 'support-consent-sheet';
const SUPPORT_CONSENT_CONFIRM_TEST_ID = 'support-consent-sheet-confirm-button';

const usdWalletAddress = toChecksumHexAddress(VBA_TEST_MONEY_ADDRESS);

const usdBankInstructions = {
  type: 'UsBank',
  rail: 'ACH',
  accountHolder: 'Ada Lovelace',
  routingNumber: '021000021',
  accountNumber: '123456789',
  bankName: 'Example Bank',
} as const satisfies AutorampDepositInstructions;

const approvedUsdAccount = (): AutorampAccount => ({
  id: 'ar-usd',
  customerId: 'customer-usd',
  walletAddress: usdWalletAddress,
  status: AutorampStatus.Approved,
  lastSeenStatus: AutorampStatus.Created,
  updatedAt: 1,
  depositRailsSummary: { currency: 'USD', ready: true },
});

interface AccountCursor {
  id: string;
  walletAddress: string;
  status: string;
  depositRailsSummary?: { currency?: string };
}

const ramps = Engine.context.RampsController as unknown as {
  state?: { autoramps: AccountCursor[] };
  hydrateVbaOnboarding: jest.Mock;
  refreshAutoramp?: jest.Mock;
  createAutoramp: jest.Mock;
};

const authentication = Engine.context.AuthenticationController as unknown as {
  getCustomerServiceToken: jest.Mock;
};

const engineContext = Engine.context as unknown as {
  NeoBankService?: { getDepositInstructions: jest.Mock };
};

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const SupportModalStack = createNativeStackNavigator();

const UsdAccountCreateSupportModal = () => (
  <SupportModalStack.Navigator screenOptions={{ headerShown: false }}>
    <SupportModalStack.Screen
      name={Routes.MODAL.SUPPORT_CONSENT_SHEET}
      component={SupportConsentSheet}
    />
  </SupportModalStack.Navigator>
);

let restoreUsdAccountCreateStore: (() => void) | undefined;

const bindUsdAccountCreateStore = (store: ReduxStore) => {
  restoreUsdAccountCreateStore?.();
  let previousStore: ReduxStore | undefined;
  try {
    previousStore = ReduxService.store;
  } catch {
    previousStore = undefined;
  }
  ReduxService.store = store;
  restoreUsdAccountCreateStore = () => {
    restoreUsdAccountCreateStore = undefined;
    if (previousStore) {
      ReduxService.store = previousStore;
    }
  };
};

const renderUsdAccountCreate = () => {
  const state = initialStateVba({ location: 'US-NY' })
    .withRemoteFeatureFlags({
      [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
        enabled: true,
        minimumVersion: '0.0.0',
        regions: ['US'],
        regionCurrencies: { US: 'USD' },
      },
    })
    .build();
  const result = renderScreenWithRoutes(
    VbaDetails as unknown as React.ComponentType,
    { name: Routes.RAMP.VBA_DETAILS },
    [
      {
        name: Routes.RAMP.VBA_ONBOARDING,
        Component:
          VbaOnboardingNavigator as unknown as React.ComponentType<object>,
      },
      { name: Routes.HOME_TABS },
      {
        name: Routes.MODAL.ROOT_MODAL_FLOW,
        Component: UsdAccountCreateSupportModal,
      },
    ],
    { state },
  );
  bindUsdAccountCreateStore(result.store as unknown as ReduxStore);
  return result;
};

const usdCreateRequest = buildMusdAutorampRequest(usdWalletAddress, 'USD');

describeForPlatforms('USD account-create error view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    ramps.state = { autoramps: [] };
    ramps.hydrateVbaOnboarding.mockResolvedValue({
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'submitted',
      kycStatus: 'approved',
      autorampStatus: 'not_ready',
    });
    ramps.refreshAutoramp = jest.fn();
    ramps.createAutoramp = jest.fn();
    authentication.getCustomerServiceToken = jest
      .fn()
      .mockResolvedValue(undefined);
    engineContext.NeoBankService = {
      getDepositInstructions: jest.fn().mockResolvedValue(null),
    };
  });

  afterEach(() => {
    restoreUsdAccountCreateStore?.();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__resetMockNetInfo();
    jest.restoreAllMocks();
    delete engineContext.NeoBankService;
    ramps.state = { autoramps: [] };
  });

  it('retries a USD server failure and shows the bank transfer details', async () => {
    ramps.hydrateVbaOnboarding.mockResolvedValue({
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'submitted',
      kycStatus: 'approved',
      autorampStatus: 'needs_source_currency',
    });
    ramps.createAutoramp.mockImplementation(async () => {
      if (ramps.createAutoramp.mock.calls.length === 1) {
        throw new WalletRegistrationError('transient', { httpStatus: 500 });
      }
      const account = approvedUsdAccount();
      ramps.state = { autoramps: [account] };
      return account;
    });
    engineContext.NeoBankService?.getDepositInstructions.mockResolvedValue(
      usdBankInstructions,
    );
    const { findByTestId, getByTestId, getByText, queryByTestId } =
      renderUsdAccountCreate();

    expect(
      await findByTestId(
        `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`,
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.generic.primary'),
      ),
    ).toBeOnTheScreen();
    expect(ramps.createAutoramp).toHaveBeenCalledTimes(1);
    expect(ramps.createAutoramp).toHaveBeenCalledWith(usdCreateRequest);

    fireEvent.press(
      getByTestId(VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON),
    );

    const routingRow = await findByTestId(
      VbaDetailsSelectorsIDs.ROUTING_NUMBER,
      {},
      { timeout: 3000 },
    );
    expect(
      within(routingRow).getByText(usdBankInstructions.routingNumber),
    ).toBeOnTheScreen();
    expect(
      within(getByTestId(VbaDetailsSelectorsIDs.ACCOUNT_NUMBER)).getByText(
        usdBankInstructions.accountNumber,
      ),
    ).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.bank_transfer_title'),
    );
    expect(
      queryByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`),
    ).not.toBeOnTheScreen();
    expect(ramps.createAutoramp).toHaveBeenCalledTimes(2);
    expect(ramps.createAutoramp).toHaveBeenNthCalledWith(2, usdCreateRequest);
  });

  it('opens the support URL from a non-retryable USD account error', async () => {
    ramps.state = {
      autoramps: [
        {
          id: 'ar-usd-rejected',
          walletAddress: usdWalletAddress,
          status: AutorampStatus.Rejected,
          depositRailsSummary: { currency: 'USD' },
        },
      ],
    };
    const { findByTestId, getByTestId, getByText, queryByText } =
      renderUsdAccountCreate();

    expect(
      await findByTestId(
        `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`,
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();
    expect(
      queryByText(
        strings('virtual_bank_account.account_create_error.generic.primary'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.details.primary'),
      ),
    ).toBeOnTheScreen();
    expect(ramps.createAutoramp).not.toHaveBeenCalled();

    fireEvent.press(
      getByTestId(VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON),
    );

    expect(await findByTestId(SUPPORT_CONSENT_SHEET_TEST_ID)).toBeOnTheScreen();

    fireEvent.press(getByTestId(SUPPORT_CONSENT_CONFIRM_TEST_ID));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledTimes(1);
    });
    const openedUrl = String(jest.mocked(Linking.openURL).mock.calls[0]?.[0]);
    expect(openedUrl).toBe(buildSupportUrl(METAMASK_SUPPORT_URL));
    expect(new URL(openedUrl).searchParams.has('http_status')).toBe(false);
    expect(ramps.createAutoramp).not.toHaveBeenCalled();
  });

  it('opens the support URL from the USD details account error', async () => {
    ramps.state = {
      autoramps: [
        {
          id: 'ar-usd-registration-failed',
          walletAddress: usdWalletAddress,
          status: 'RegistrationFailed',
          depositRailsSummary: { currency: 'USD' },
        },
      ],
    };
    const { findByTestId, getByTestId, getByText, queryByTestId } =
      renderUsdAccountCreate();

    expect(
      await findByTestId(
        `${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-details`,
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('virtual_bank_account.account_create_error.details.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-generic`),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON),
    );

    expect(await findByTestId(SUPPORT_CONSENT_SHEET_TEST_ID)).toBeOnTheScreen();

    fireEvent.press(getByTestId(SUPPORT_CONSENT_CONFIRM_TEST_ID));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledTimes(1);
    });
    const openedUrl = String(jest.mocked(Linking.openURL).mock.calls[0]?.[0]);
    expect(openedUrl).toBe(
      buildSupportUrl(
        buildAccountCreateSupportUrl(METAMASK_SUPPORT_URL, {
          httpStatus: 200,
          fiatStatus: 'RegistrationFailed',
        }),
      ),
    );
    const params = new URL(openedUrl).searchParams;
    expect(params.get('http_status')).toBe('200');
    expect(params.get('fiat_status')).toBe('RegistrationFailed');
    expect(params.get('utm_source')).toBe('mobile_app');
    expect(ramps.createAutoramp).not.toHaveBeenCalled();
  });
});
