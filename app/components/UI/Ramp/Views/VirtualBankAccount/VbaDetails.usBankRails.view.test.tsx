import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { Platform } from 'react-native';
import nock from 'nock';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import NetInfo from '@react-native-community/netinfo';
import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import type {
  AutorampRemoteSnapshot,
  NeoBankAutorampResponse,
  NeoBankService,
  UsBankDepositInstructions,
  UsBankDepositRail,
} from '@metamask/ramps-controller';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import ReduxService, { type ReduxStore } from '../../../../../core/redux';
import Routes from '../../../../../constants/navigation/Routes';
import { neoBankServiceInit } from '../../../../../core/Engine/controllers/ramps-controller/neo-bank-service-init';
import { getNeoBankServiceMessenger } from '../../../../../core/Engine/messengers/neo-bank-service-messenger/neo-bank-service-messenger';
import { MONEY_MOVEMENT_NEOBANK_FLAG_KEY } from '../../../../../selectors/featureFlagController/moneyAccount';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from '../../../../../../tests/component-view/api-mocking/nockHelpers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderScreenWithRoutes } from '../../../../../../tests/component-view/render';
import {
  initialStateVba,
  VBA_TEST_MONEY_ADDRESS,
} from '../../../../../../tests/component-view/presets/vba';
import { clearCachedDepositInstructions } from './vbaDepositInstructionsCache';
import { resetMusdAutorampSetupGuard } from './ensureMusdAutoramp';
import VbaDetails, { VbaDetailsSelectorsIDs } from './VbaDetails';

/**
 * USD deposit details through the real NeoBankService.
 *
 * Real: VbaDetails, NeoBankService (URL, auth header, `deposit_rails` parsing,
 * ACH-over-Wire preference), the Engine service init and messenger.
 * Fake: HTTP (nock at the neobank proxy), the bearer token, and the
 * RampsController autoramp cursor on the Engine mock.
 */

const AUTORAMP_ID = 'ar-usd-rails';
const BEARER_TOKEN = 'usd-rails-bearer-token';
// The host depends on the API environment, so match every on-ramp API host.
// nock matches a RegExp host against `protocol://host:port`.
const NEOBANK_HOST =
  /^https?:\/\/(on-ramp\.[a-z-]*api\.cx\.metamask\.io|localhost)(:\d+)?$/u;
const AUTORAMP_PATH = `/neobank/autoramps/${AUTORAMP_ID}`;

/** MoonPay `deposit_rails` entry for a US rail, as the neobank proxy mirrors it. */
interface UsBankRailRecord {
  type: UsBankDepositRail;
  recipient_name: string;
  recipient_address?: string;
  routing_number?: string;
  account_number: string;
  bank_name: string;
  bank_address?: string;
}

type DisplayedUsBank = Pick<
  UsBankDepositInstructions,
  'accountHolder' | 'routingNumber' | 'accountNumber' | 'bankName'
>;

const ACH_DETAILS: DisplayedUsBank = {
  accountHolder: 'Jane Q Doe',
  routingNumber: '101019644',
  accountNumber: '2000123456789',
  bankName: 'Lead Bank',
};

const WIRE_DETAILS: DisplayedUsBank = {
  accountHolder: 'Jane Q Doe',
  routingNumber: '026009593',
  accountNumber: '9876543210',
  bankName: 'Lead Bank',
};

const railFor = (
  type: UsBankDepositRail,
  details: DisplayedUsBank,
): UsBankRailRecord => ({
  type,
  recipient_name: details.accountHolder,
  recipient_address: '1 Main St, Kansas City, MO 64105',
  routing_number: details.routingNumber,
  account_number: details.accountNumber,
  bank_name: details.bankName,
  bank_address: '1801 Main St, Kansas City, MO 64108',
});

const autorampResponse = (
  depositRails: UsBankRailRecord[],
): NeoBankAutorampResponse => ({
  id: AUTORAMP_ID,
  status: 'Approved',
  wallet_address: VBA_TEST_MONEY_ADDRESS,
  deposit_rails: depositRails,
});

const usdAutoramp: AutorampRemoteSnapshot = {
  id: AUTORAMP_ID,
  walletAddress: VBA_TEST_MONEY_ADDRESS,
  status: 'Approved',
  depositRailsSummary: { currency: 'USD', ready: true },
};

const ramps = Engine.context.RampsController as unknown as {
  state?: { autoramps: AutorampRemoteSnapshot[] };
};
const engineContext = Engine.context as unknown as {
  NeoBankService?: NeoBankService;
};
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const createRealNeoBankService = (): NeoBankService => {
  const rootMessenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
  (
    rootMessenger as unknown as {
      registerActionHandler: (
        action: string,
        handler: () => Promise<string>,
      ) => void;
    }
  ).registerActionHandler(
    'AuthenticationController:getBearerToken',
    async () => BEARER_TOKEN,
  );
  const { controller } = neoBankServiceInit({
    controllerMessenger: getNeoBankServiceMessenger(rootMessenger as never),
  } as unknown as Parameters<typeof neoBankServiceInit>[0]);
  return controller;
};

interface RecordedRequest {
  authorization?: string;
  context: string | null;
}

const mockAutoramp = (
  depositRails: UsBankRailRecord[],
  requests: RecordedRequest[],
) =>
  nock(NEOBANK_HOST)
    .get(AUTORAMP_PATH)
    .query(true)
    .reply(function reply(uri) {
      const authorization = this.req.headers.authorization;
      requests.push({
        authorization: Array.isArray(authorization)
          ? authorization[0]
          : authorization,
        context: new URL(uri, 'https://neobank.test').searchParams.get(
          'context',
        ),
      });
      return [200, autorampResponse(depositRails)];
    });

const usdFlags = {
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
      RampsController: { autoramps: [usdAutoramp] },
    },
  },
} as unknown as DeepPartial<RootState>;

let restoreStore: (() => void) | undefined;

const renderUsdDetails = () => {
  const state = initialStateVba({ location: 'US-CA' })
    .withOverrides(usdFlags)
    .build();
  const result = renderScreenWithRoutes(
    VbaDetails as unknown as React.ComponentType,
    { name: Routes.RAMP.VBA_DETAILS },
    [{ name: Routes.HOME_TABS }],
    { state },
  );
  let previousStore: ReduxStore | undefined;
  try {
    previousStore = ReduxService.store;
  } catch {
    previousStore = undefined;
  }
  ReduxService.store = result.store as unknown as ReduxStore;
  restoreStore = () => {
    if (previousStore) {
      ReduxService.store = previousStore;
    }
  };
  return result;
};

const ROWS = [
  {
    testID: VbaDetailsSelectorsIDs.ACCOUNT_HOLDER,
    copyId: 'account-holder',
    labelKey: 'virtual_bank_account.vba_details.account_holder_label',
    field: 'accountHolder',
  },
  {
    testID: VbaDetailsSelectorsIDs.ROUTING_NUMBER,
    copyId: 'routing-number',
    labelKey: 'virtual_bank_account.vba_details.routing_number_label',
    field: 'routingNumber',
  },
  {
    testID: VbaDetailsSelectorsIDs.ACCOUNT_NUMBER,
    copyId: 'account-number',
    labelKey: 'virtual_bank_account.vba_details.account_number_label',
    field: 'accountNumber',
  },
  {
    testID: VbaDetailsSelectorsIDs.BANK_NAME,
    copyId: 'bank-name',
    labelKey: 'virtual_bank_account.vba_details.bank_name_label',
    field: 'bankName',
  },
] as const;

describeForPlatforms('VbaDetails USD rails from the neobank API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAllNockMocks();
    disableNetConnect();
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    ramps.state = { autoramps: [usdAutoramp] };
    engineContext.NeoBankService = createRealNeoBankService();
  });

  afterEach(() => {
    restoreStore?.();
    restoreStore = undefined;
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    delete engineContext.NeoBankService;
    ramps.state = { autoramps: [] };
    netInfoMock.__resetMockNetInfo();
    teardownNock();
  });

  it('shows the ACH routing and account numbers, not the Wire ones, and copies each value exactly', async () => {
    const requests: RecordedRequest[] = [];
    // Wire is listed first so the screen must prefer ACH, not array order.
    const scope = mockAutoramp(
      [railFor('Wire', WIRE_DETAILS), railFor('ACH', ACH_DETAILS)],
      requests,
    );

    const { findByTestId, getByTestId, queryByText } = renderUsdDetails();

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.ROUTING_NUMBER),
    ).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.bank_transfer_title'),
    );
    for (const row of ROWS) {
      const rowNode = getByTestId(row.testID);
      expect(
        within(rowNode).getByText(strings(row.labelKey)),
      ).toBeOnTheScreen();
      expect(
        within(rowNode).getByText(ACH_DETAILS[row.field]),
      ).toBeOnTheScreen();

      fireEvent.press(
        getByTestId(`${VbaDetailsSelectorsIDs.COPY_BUTTON}-${row.copyId}`),
      );

      expect(Clipboard.setString).toHaveBeenLastCalledWith(
        ACH_DETAILS[row.field],
      );
    }
    expect(Clipboard.setString).toHaveBeenCalledTimes(ROWS.length);
    expect(queryByText(WIRE_DETAILS.routingNumber)).toBeNull();
    expect(queryByText(WIRE_DETAILS.accountNumber)).toBeNull();
    expect(scope.isDone()).toBe(true);
    expect(requests).toEqual([
      {
        authorization: `Bearer ${BEARER_TOKEN}`,
        context: Platform.OS === 'ios' ? 'mobile-ios' : 'mobile-android',
      },
    ]);
  });

  it('shows the Wire routing and account numbers when the account has only a Wire rail', async () => {
    const requests: RecordedRequest[] = [];
    mockAutoramp([railFor('Wire', WIRE_DETAILS)], requests);

    const { findByTestId, getByTestId } = renderUsdDetails();

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.ROUTING_NUMBER),
    ).toHaveTextContent(WIRE_DETAILS.routingNumber, { exact: false });
    expect(
      getByTestId(VbaDetailsSelectorsIDs.ACCOUNT_NUMBER),
    ).toHaveTextContent(WIRE_DETAILS.accountNumber, { exact: false });
    expect(
      getByTestId(VbaDetailsSelectorsIDs.ACCOUNT_HOLDER),
    ).toHaveTextContent(WIRE_DETAILS.accountHolder, { exact: false });

    fireEvent.press(
      getByTestId(`${VbaDetailsSelectorsIDs.COPY_BUTTON}-routing-number`),
    );

    expect(Clipboard.setString).toHaveBeenCalledWith(
      WIRE_DETAILS.routingNumber,
    );
  });

  it('keeps loading and shows no account number while the US rail has no routing number', async () => {
    const requests: RecordedRequest[] = [];
    const incomplete = railFor('ACH', ACH_DETAILS);
    delete incomplete.routing_number;
    const scope = mockAutoramp([incomplete], requests);

    const { getByTestId, queryByTestId, queryByText } = renderUsdDetails();

    await waitFor(() => expect(scope.isDone()).toBe(true));

    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
    expect(queryByTestId(VbaDetailsSelectorsIDs.ACCOUNT_NUMBER)).toBeNull();
    expect(queryByText(ACH_DETAILS.accountNumber)).toBeNull();
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR)).toBeNull();
  });
});
