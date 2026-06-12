import React from 'react';
import { userEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import DeFiProtocolPositionDetails, {
  DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID,
} from './DeFiProtocolPositionDetails';
import { CommonSelectorsIDs } from '../../../util/Common.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';

const mockPop = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      pop: mockPop,
    }),
  };
});

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: jest.fn(() => ({
    networkIconAvatar: 10,
    protocolAggregate: {
      protocolDetails: {
        name: 'Protocol 1',
        iconUrl: 'https://example.com/protocol1.png',
      },
      aggregatedMarketValue: 100,
      positionTypes: {
        supply: {
          aggregatedMarketValue: 100,
          positions: [
            [
              {
                protocolTokenAddress: '0x1234567890abcdef',
                marketValue: 100,
                tokens: [
                  {
                    name: 'Token 1',
                    symbol: 'TKN1',
                    iconUrl: 'https://example.com/tkn1.png',
                    balance: 500,
                    marketValue: 100,
                    type: 'underlying',
                  },
                ],
              },
            ],
          ],
        },
      },
    },
  })),
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        privacyMode: false,
      },
    },
  },
};

describe('DeFiProtocolPositionDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the protocol name header and aggregated balance', async () => {
    const { findByText, findByTestId } = renderWithProvider(
      <DeFiProtocolPositionDetails />,
      {
        state: mockInitialState,
      },
    );

    expect(await findByText('Protocol 1')).toBeOnTheScreen();
    expect(
      await findByTestId(DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID),
    ).toHaveTextContent('$100.00');
  });

  it('renders the component without aggregated balance in privacy mode', async () => {
    const { findByText, queryByText, findByTestId } = renderWithProvider(
      <DeFiProtocolPositionDetails />,
      {
        state: {
          engine: {
            backgroundState: {
              ...backgroundState,
              PreferencesController: {
                ...backgroundState.PreferencesController,
                privacyMode: true,
              },
            },
          },
        },
      },
    );

    expect(await findByText('Protocol 1')).toBeOnTheScreen();
    expect(queryByText(/^\$\d+\.\d{2}$/)).not.toBeOnTheScreen(); // Matches dollar amounts like "$100.00"
    expect(
      await findByTestId(DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID),
    ).toHaveTextContent('•••••••••');
  });

  it('calls navigation.pop when the header back button is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <DeFiProtocolPositionDetails />,
      {
        state: mockInitialState,
      },
    );

    await userEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockPop).toHaveBeenCalledTimes(1);
  });

  it('renders SafeAreaView with left, right, and bottom edges only', () => {
    const { getByTestId } = renderWithProvider(
      <DeFiProtocolPositionDetails />,
      {
        state: mockInitialState,
      },
    );

    expect(
      getByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER).props
        .edges,
    ).toEqual(['left', 'right', 'bottom']);
  });
});
