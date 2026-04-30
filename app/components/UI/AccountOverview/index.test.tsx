import React from 'react';
import { act, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AccountOverview from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Engine from '../../../core/Engine';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { AccountOverviewSelectorsIDs } from './AccountOverview.testIds';
import { analytics } from '../../../util/analytics/analytics';

const mockTrackEvent = jest.fn();
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    isEnabled: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('../../../util/analytics/AnalyticsEventBuilder', () => {
  const createEventBuilder = (eventName: string) => {
    const builder = {
      addProperties: jest.fn(),
      addSensitiveProperties: jest.fn(),
      build: jest.fn(() => ({ name: eventName })),
    };
    builder.addProperties.mockReturnValue(builder);
    builder.addSensitiveProperties.mockReturnValue(builder);
    return builder;
  };
  return {
    AnalyticsEventBuilder: { createEventBuilder },
  };
});

jest.mock('../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

const mockedEngine = Engine;

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  const { KeyringTypes } = jest.requireActual('@metamask/keyring-controller');

  return {
    init: () => mockedEngine.init(''),
    context: {
      KeyringController: {
        getQRKeyringState: async () => ({ subscribe: () => ({}) }),
        state: {
          keyrings: [
            {
              accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
              index: 0,
              type: KeyringTypes.hd,
              metadata: {
                id: '01JNG71B7GTWH0J1TSJY9891S0',
                name: '',
              },
            },
          ],
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  browser: { tabs: [] },
  security: { dataCollectionForMarketing: false },
};

describe('AccountOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot when given account with address and label', () => {
    const account = {
      address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
      balanceFiat: 1604.2,
      label: 'Account 1',
    };
    const { toJSON } = renderWithProvider(
      <AccountOverview account={account} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('tracks WALLET_COPIED_ADDRESS when address is pressed', async () => {
    const account = {
      address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
      balanceFiat: 1604.2,
      label: 'Account 1',
    };
    const { getByTestId } = renderWithProvider(
      <AccountOverview account={account} />,
      { state: mockInitialState },
    );

    mockTrackEvent.mockClear();

    const addressCopyButton = getByTestId(
      AccountOverviewSelectorsIDs.ADDRESS_COPY_BUTTON,
    );
    await act(async () => {
      await addressCopyButton.props.onPress();
    });

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: MetaMetricsEvents.WALLET_COPIED_ADDRESS,
        }),
      );
    });
  });

  it('tracks PORTFOLIO_LINK_CLICKED when onOpenPortfolio is called', async () => {
    const account = {
      address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
      balanceFiat: 1604.2,
      label: 'Account 1',
    };
    const mockNavigate = jest.fn();
    const onRef = jest.fn();

    renderWithProvider(
      <AccountOverview
        account={account}
        navigation={{ navigate: mockNavigate }}
        onRef={onRef}
      />,
      { state: mockInitialState },
    );

    await waitFor(() => {
      expect(onRef).toHaveBeenCalled();
    });

    mockTrackEvent.mockClear();
    const overviewInstance = onRef.mock.calls[0][0];
    overviewInstance.onOpenPortfolio();

    expect(jest.mocked(analytics.isEnabled)).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.PORTFOLIO_LINK_CLICKED,
      }),
    );
  });
});
