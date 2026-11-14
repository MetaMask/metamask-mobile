import './mocks';
import NetInfo from '@react-native-community/netinfo';
import Clipboard from '@react-native-clipboard/clipboard';
import Share from 'react-native-share';
import { toast } from '@metamask/design-system-react-native';
import { fireEvent } from '@testing-library/react-native';
import type NetInfoMock from '../../app/__mocks__/@react-native-community/netinfo';
import Engine from '../../app/core/Engine';
import { strings } from '../../locales/i18n';
import type { RootState } from '../../app/reducers';
import { MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY } from '../../app/selectors/featureFlagController/moneyAccount';
import type { DeepPartial } from '../../app/util/test/renderWithProvider';
import { describeForPlatforms } from './platform';
import { VBA_TEST_MONEY_ADDRESS } from './presets/vba';
import { renderVbaDetails, restoreVbaReduxServiceStore } from './renderers/vba';
import { resetMusdAutorampSetupGuard } from '../../app/components/UI/Ramp/Views/VirtualBankAccount/ensureMusdAutoramp';
import { clearCachedDepositInstructions } from '../../app/components/UI/Ramp/Views/VirtualBankAccount/vbaDepositInstructionsCache';
import { VbaDetailsSelectorsIDs } from '../../app/components/UI/Ramp/Views/VirtualBankAccount/VbaDetails';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const rampsController = Engine.context.RampsController as unknown as {
  state?: unknown;
};
const engineContext = Engine.context as unknown as {
  NeoBankService?: { getDepositInstructions: jest.Mock };
};
const mockGetDepositInstructions = jest.fn();
let previousRampsState: unknown;
let unmountScreen: (() => void) | undefined;

const pixInstructions = {
  type: 'Pix' as const,
  brCode: '00020126',
  instruction: 'Pay with PIX',
  pixKey: 'pix@example.com',
};

const usBankInstructions = {
  type: 'UsBank' as const,
  rail: 'ACH',
  accountHolder: 'Jane Doe',
  routingNumber: '021000021',
  accountNumber: '123456789',
  bankName: 'Lead Bank',
};

const usdMarketOverrides = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          [MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY]: {
            enabled: true,
            minimumVersion: '0.0.0',
            currency: 'USD',
            regions: ['US'],
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

const setApprovedAutoramp = (currency: 'BRL' | 'USD'): void => {
  rampsController.state = {
    autoramps: [
      {
        id: 'ar-1',
        walletAddress: VBA_TEST_MONEY_ADDRESS,
        status: 'Approved',
        depositRailsSummary: { currency },
      },
    ],
  };
};

const expectCopiedFieldToast = (field: string): void => {
  expect(toast).toHaveBeenCalledWith({
    title: strings('virtual_bank_account.vba_details.copied_label', { field }),
    hasNoTimeout: false,
  });
};

describeForPlatforms('VbaDetails copy confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Share.open).mockResolvedValue({ success: true, message: '' });
    mockGetDepositInstructions.mockReset();
    clearCachedDepositInstructions();
    previousRampsState = rampsController.state;
    engineContext.NeoBankService = {
      getDepositInstructions: mockGetDepositInstructions,
    };
    netInfoMock.__setMockNetInfo({
      type: 'wifi',
      isInternetReachable: true,
    });
  });

  afterEach(() => {
    unmountScreen?.();
    unmountScreen = undefined;
    rampsController.state = previousRampsState;
    delete engineContext.NeoBankService;
    restoreVbaReduxServiceStore();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__resetMockNetInfo();
  });

  it('shows a toast after copying the Pix key', async () => {
    setApprovedAutoramp('BRL');
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    const view = renderVbaDetails();
    unmountScreen = view.unmount;

    expect(
      await view.findByTestId(VbaDetailsSelectorsIDs.PIX_KEY),
    ).toBeOnTheScreen();
    jest.mocked(toast).mockClear();

    fireEvent.press(
      view.getByTestId(`${VbaDetailsSelectorsIDs.COPY_BUTTON}-pix-key`),
    );

    expectCopiedFieldToast(
      strings('virtual_bank_account.vba_details.pix_key_label'),
    );
  });

  it('shows a toast after copying a US bank row', async () => {
    setApprovedAutoramp('USD');
    mockGetDepositInstructions.mockResolvedValue(usBankInstructions);

    const view = renderVbaDetails({
      location: 'US',
      overrides: usdMarketOverrides,
    });
    unmountScreen = view.unmount;

    expect(
      await view.findByTestId(VbaDetailsSelectorsIDs.ROUTING_NUMBER),
    ).toBeOnTheScreen();
    jest.mocked(toast).mockClear();

    fireEvent.press(
      view.getByTestId(`${VbaDetailsSelectorsIDs.COPY_BUTTON}-routing-number`),
    );

    expectCopiedFieldToast(
      strings('virtual_bank_account.vba_details.routing_number_label'),
    );
  });

  it('does not show a toast after copying all bank details', async () => {
    setApprovedAutoramp('USD');
    mockGetDepositInstructions.mockResolvedValue(usBankInstructions);

    const view = renderVbaDetails({
      location: 'US',
      overrides: usdMarketOverrides,
    });
    unmountScreen = view.unmount;

    expect(
      await view.findByTestId(VbaDetailsSelectorsIDs.COPY_ALL_BUTTON),
    ).toBeOnTheScreen();
    jest.mocked(toast).mockClear();
    jest.mocked(Clipboard.setString).mockClear();

    fireEvent.press(view.getByTestId(VbaDetailsSelectorsIDs.COPY_ALL_BUTTON));

    expect(Clipboard.setString).toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});
