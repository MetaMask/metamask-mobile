import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { PayWithNetworkModal } from './pay-with-network-modal';
import { initialState } from '../../../../../UI/Bridge/_mocks_/initialState';
import Routes from '../../../../../../constants/navigation/Routes';
import { fireEvent, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as bridgeReducer from '../../../../../../core/redux/slices/bridge';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';

const mockGoBack = jest.fn();

jest.mock('../../../hooks/pay/useTransactionPayAvailableTokens');

jest.mock(
  '../../../../../../core/redux/slices/bridge/utils/hasMinimumRequiredVersion',
  () => ({
    hasMinimumRequiredVersion: jest.fn().mockReturnValue(true),
  }),
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

function render() {
  return renderScreen(
    PayWithNetworkModal,
    {
      name: Routes.CONFIRMATION_PAY_WITH_NETWORK_MODAL,
    },
    {
      state: initialState,
    },
  );
}

describe('PayWithNetworkModal', () => {
  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableChainIds: ['0x1', '0xa'],
      availableTokens: [],
    });
  });

  it('renders networks', async () => {
    const { getByText } = render();

    expect(getByText('Select network')).toBeTruthy();
    expect(getByText('Ethereum Mainnet')).toBeTruthy();
    expect(getByText('Optimism')).toBeTruthy();
  });

  describe('on network select', () => {
    it('sets selected source chains', async () => {
      const setSelectedSourceChainIdsMock = jest.spyOn(
        bridgeReducer,
        'setSelectedSourceChainIds',
      );

      const { getAllByTestId, getByText } = render();

      fireEvent.press(getAllByTestId('checkbox-0xa')[1]);
      fireEvent.press(getByText('Apply'));

      await waitFor(() => {
        expect(setSelectedSourceChainIdsMock).toHaveBeenCalledWith(['0x1']);
      });
    });

    it('navigates back', async () => {
      const { getAllByTestId, getByText } = render();

      fireEvent.press(getAllByTestId('checkbox-0xa')[1]);
      fireEvent.press(getByText('Apply'));

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });
});
