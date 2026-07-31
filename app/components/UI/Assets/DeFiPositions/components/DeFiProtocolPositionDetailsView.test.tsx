import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import DeFiProtocolPositionDetailsView, {
  DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID,
} from './DeFiProtocolPositionDetailsView';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { CommonSelectorsIDs } from '../../../../../util/Common.testIds';

const mockPop = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ pop: mockPop }),
}));

const mockInitialState = { engine: { backgroundState } };

const renderComponent = (
  overrides: Partial<
    React.ComponentProps<typeof DeFiProtocolPositionDetailsView>
  > = {},
) =>
  renderWithProvider(
    <DeFiProtocolPositionDetailsView
      title="Aave V3"
      marketValue={4100.5}
      iconUrl="https://example.com/aave.png"
      networkIconAvatar={10}
      privacyMode={false}
      {...overrides}
    >
      <Text>child-content</Text>
    </DeFiProtocolPositionDetailsView>,
    { state: mockInitialState },
  );

describe('DeFiProtocolPositionDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the container, title, formatted market value and children', () => {
    const { getByTestId, getByText } = renderComponent();

    expect(
      getByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Aave V3')).toBeOnTheScreen();
    expect(
      getByTestId(DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID),
    ).toHaveTextContent('$4,100.50');
    expect(getByText('child-content')).toBeOnTheScreen();
  });

  it('formats an undefined market value as zero', () => {
    const { getByTestId } = renderComponent({ marketValue: undefined });

    expect(
      getByTestId(DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID),
    ).toHaveTextContent('$0.00');
  });

  it('hides the market value in privacy mode', () => {
    const { getByTestId, queryByText } = renderComponent({ privacyMode: true });

    expect(queryByText('$4,100.50')).toBeNull();
    // The balance element is still present, just hidden.
    expect(
      getByTestId(DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID),
    ).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockPop).toHaveBeenCalledTimes(1);
  });
});
