import '../../../../../../tests/component-view/mocks';
import { fireEvent, within } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { MONEY_MOVEMENT_NEOBANK_FLAG_KEY } from '../../../../../selectors/featureFlagController/moneyAccount';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { VBA_TEST_MONEY_ADDRESS } from '../../../../../../tests/component-view/presets/vba';
import {
  renderVbaDetails,
  restoreVbaReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vba';
import { clearCachedDepositInstructions } from './vbaDepositInstructionsCache';
import { resetMusdAutorampSetupGuard } from './ensureMusdAutoramp';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from './vbaOnboardingSnapshot';
import { VbaCreatingAccountSelectorsIDs } from './VbaCreatingAccount';
import { VbaDetailsSelectorsIDs } from './VbaDetails';

const USD_AUTORAMP_ID = 'ar-usd';
const US_BANK = {
  type: 'UsBank' as const,
  rail: 'ACH',
  accountHolder: 'Jane Doe',
  routingNumber: '021000021',
  accountNumber: '123456789',
  bankName: 'Lead Bank',
};

interface TestAutoramp {
  id: string;
  walletAddress: string;
  status: string;
  depositRailsSummary?: { currency?: string; ready: boolean };
}

const usdAutoramp: TestAutoramp = {
  id: USD_AUTORAMP_ID,
  walletAddress: VBA_TEST_MONEY_ADDRESS,
  status: 'Approved',
  depositRailsSummary: { currency: 'USD', ready: true },
};

const usdRegionOverrides = (autoramps: TestAutoramp[] = [usdAutoramp]) =>
  ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
              enabled: true,
              minimumVersion: '0.0.0',
              regions: ['US'],
              regionCurrencies: { US: 'USD' },
            },
          },
        },
        RampsController: {
          autoramps,
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

const ramps = Engine.context.RampsController as unknown as {
  state?: { autoramps: TestAutoramp[] };
  hydrateVbaOnboarding: jest.Mock;
  createAutoramp?: jest.Mock;
};
const engineContext = Engine.context as unknown as {
  NeoBankService?: { getDepositInstructions: jest.Mock };
};
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const detailRows = [
  {
    testID: VbaDetailsSelectorsIDs.ACCOUNT_HOLDER,
    label: strings('virtual_bank_account.vba_details.account_holder_label'),
    value: US_BANK.accountHolder,
    copyId: 'account-holder',
  },
  {
    testID: VbaDetailsSelectorsIDs.ROUTING_NUMBER,
    label: strings('virtual_bank_account.vba_details.routing_number_label'),
    value: US_BANK.routingNumber,
    copyId: 'routing-number',
  },
  {
    testID: VbaDetailsSelectorsIDs.ACCOUNT_NUMBER,
    label: strings('virtual_bank_account.vba_details.account_number_label'),
    value: US_BANK.accountNumber,
    copyId: 'account-number',
  },
  {
    testID: VbaDetailsSelectorsIDs.BANK_NAME,
    label: strings('virtual_bank_account.vba_details.bank_name_label'),
    value: US_BANK.bankName,
    copyId: 'bank-name',
  },
] as const;

describeForPlatforms('VbaDetails USD bank details view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    ramps.state = { autoramps: [usdAutoramp] };
    engineContext.NeoBankService = {
      getDepositInstructions: jest.fn().mockResolvedValue(US_BANK),
    };
  });

  afterEach(() => {
    restoreVbaReduxServiceStore();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    delete ramps.createAutoramp;
    netInfoMock.__resetMockNetInfo();
    delete engineContext.NeoBankService;
    ramps.state = { autoramps: [] };
  });

  it('shows the USD bank rows and copies each value', async () => {
    const { findByTestId, getByTestId } = renderVbaDetails({
      location: 'US',
      overrides: usdRegionOverrides(),
    });

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.ACCOUNT_HOLDER),
    ).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.bank_transfer_title'),
    );
    expect(
      engineContext.NeoBankService?.getDepositInstructions,
    ).toHaveBeenCalledWith(USD_AUTORAMP_ID);

    for (const row of detailRows) {
      const rowNode = getByTestId(row.testID);
      expect(within(rowNode).getByText(row.label)).toBeOnTheScreen();
      expect(within(rowNode).getByText(row.value)).toBeOnTheScreen();

      fireEvent.press(
        getByTestId(`${VbaDetailsSelectorsIDs.COPY_BUTTON}-${row.copyId}`),
      );

      expect(Clipboard.setString).toHaveBeenCalledWith(row.value);
    }

    expect(Clipboard.setString).toHaveBeenCalledTimes(detailRows.length);
  });

  it('shows the deposit load error when USD bank details fail to load', async () => {
    engineContext.NeoBankService?.getDepositInstructions.mockRejectedValue(
      new Error('usd details failed'),
    );
    const { findByTestId, getByTestId, queryByTestId } = renderVbaDetails({
      location: 'US',
      overrides: usdRegionOverrides(),
    });

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR),
    ).toHaveTextContent(strings('virtual_bank_account.vba_details.load_error'));
    expect(
      engineContext.NeoBankService?.getDepositInstructions,
    ).toHaveBeenCalledWith(USD_AUTORAMP_ID);
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.ACCOUNT_HOLDER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.ROUTING_NUMBER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.ACCOUNT_NUMBER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.BANK_NAME),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.DONE_BUTTON));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
  });

  it('waits for the provider instead of creating a USD account before activation', async () => {
    ramps.state = { autoramps: [] };
    ramps.createAutoramp = jest.fn();
    ramps.hydrateVbaOnboarding.mockResolvedValue({
      ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
      sessionExists: true,
      vendorDisclaimersComplete: true,
      sessionDisclaimersComplete: true,
      providerFlowStatus: 'submitted',
      kycStatus: 'approved',
      autorampStatus: 'not_ready',
    });
    const { findByText, getByTestId, queryByTestId } = renderVbaDetails({
      location: 'US',
      overrides: usdRegionOverrides([]),
    });

    expect(
      await findByText(
        strings('virtual_bank_account.creating_account.awaiting_provider'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaCreatingAccountSelectorsIDs.SPINNER),
    ).toBeOnTheScreen();
    expect(ramps.hydrateVbaOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ refreshKyc: false, refreshAutoramps: true }),
    );
    expect(ramps.createAutoramp).not.toHaveBeenCalled();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.ACCOUNT_HOLDER),
    ).not.toBeOnTheScreen();
  });
});
