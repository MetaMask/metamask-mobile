import '../../../../../../tests/component-view/mocks';
import type { ComponentType } from 'react';
import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { NeoBankService } from '@metamask/ramps-controller';
import NetInfo from '@react-native-community/netinfo';
import { waitFor } from '@testing-library/react-native';
import nock from 'nock';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { VBA_TEST_MONEY_ADDRESS, initialStateVba } from '../../../../../../tests/component-view/presets/vba';
import { renderScreenWithRoutes } from '../../../../../../tests/component-view/render';
import Routes from '../../../../../constants/navigation/Routes';
import {
  MONEY_MOVEMENT_NEOBANK_FLAG_KEY,
  MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY,
} from '../../../../../selectors/featureFlagController/moneyAccount';
import VbaDetails, { VbaDetailsSelectorsIDs } from './VbaDetails';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

/**
 * USD bank details, read by the real `NeoBankService` from
 * `GET /neobank/autoramps/:id`. The body is synthetic.
 */

const NEOBANK_ORIGIN = 'https://neobank.test';
const AUTORAMP_ID = 'ar-usd-synthetic';

const SYNTHETIC_US_BANK = {
  id: AUTORAMP_ID,
  deposit_rails: [
    {
      type: 'ACH',
      recipient_name: 'Synthetic Holder',
      routing_number: '110000000',
      account_number: '000111222',
      bank_name: 'Synthetic Bank',
    },
  ],
};

const ramps = Engine.context.RampsController as {
  state?: {
    autoramps: {
      id: string;
      walletAddress: string;
      status: string;
      depositRailsSummary?: { currency?: string };
    }[];
  };
};

const createNeoBank = (): NeoBankService => {
  const rootMessenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
  const register = (
    rootMessenger as unknown as {
      registerActionHandler: (
        action: string,
        handler: (...args: unknown[]) => unknown,
      ) => void;
    }
  ).registerActionHandler.bind(rootMessenger);
  register('AuthenticationController:getBearerToken', async () => 'synthetic-token');
  return new NeoBankService({
    messenger: rootMessenger as never,
    fetch,
    context: 'mobile-test',
    baseUrlOverride: NEOBANK_ORIGIN,
  });
};

const NEO_BANK_SERVICE = 'NeoBankService';

describeForPlatforms('VBA details: USD bank instructions over HTTP', () => {
  const context = Engine.context as unknown as Record<
    string,
    NeoBankService | undefined
  >;
  let previousNeoBank: NeoBankService | undefined;
  let previousAutoramps: typeof ramps.state;

  beforeEach(() => {
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    nock.cleanAll();
    nock.disableNetConnect();
    nock(NEOBANK_ORIGIN)
      .get(`/neobank/autoramps/${AUTORAMP_ID}`)
      .query(true)
      .times(4)
      .reply(200, SYNTHETIC_US_BANK);

    previousNeoBank = context[NEO_BANK_SERVICE];
    context[NEO_BANK_SERVICE] = createNeoBank();
    previousAutoramps = ramps.state;
    ramps.state = {
      autoramps: [
        {
          id: AUTORAMP_ID,
          walletAddress: VBA_TEST_MONEY_ADDRESS,
          status: 'Approved',
          depositRailsSummary: { currency: 'USD' },
        },
      ],
    };
  });

  afterEach(() => {
    context[NEO_BANK_SERVICE] = previousNeoBank;
    ramps.state = previousAutoramps;
    nock.cleanAll();
    nock.enableNetConnect();
    netInfoMock.__resetMockNetInfo();
  });

  it('shows the synthetic US bank rows from the autoramp details endpoint', async () => {
    const state = initialStateVba({ location: 'US' })
      .withRemoteFeatureFlags({
        [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
          enabled: true,
          minimumVersion: '0.0.0',
        },
        [MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY]: {
          enabled: true,
          minimumVersion: '0.0.0',
          currency: 'USD',
          regions: ['US'],
        },
      })
      .build();

    const neoBank = context[NEO_BANK_SERVICE];
    if (!neoBank) {
      throw new Error('NeoBankService was not installed');
    }
    const getDepositInstructions = jest.spyOn(neoBank, 'getDepositInstructions');

    const { getByTestId, getByText } = renderScreenWithRoutes(
      VbaDetails as unknown as ComponentType,
      { name: Routes.RAMP.VBA_DETAILS },
      [],
      { state },
    );

    await waitFor(() => {
      expect(getDepositInstructions).toHaveBeenCalledWith(AUTORAMP_ID);
    });
    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.ACCOUNT_HOLDER)).toBeOnTheScreen();
    });
    expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.bank_transfer_title'),
    );
    expect(getByText('Synthetic Holder')).toBeOnTheScreen();
    expect(getByText('110000000')).toBeOnTheScreen();
    expect(getByText('000111222')).toBeOnTheScreen();
    expect(getByText('Synthetic Bank')).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.BANK_NAME)).toBeOnTheScreen();
  });
});
