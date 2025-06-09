import { renderScreen } from '../../../../../util/test/renderWithProvider';
import MaxInputModal from '.';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockHandleMaxPress = jest.fn();
const mockUseRoute = jest.fn().mockReturnValue({
  params: {
    isEth: true,
    ticker: 'ETH',
    handleMaxPress: mockHandleMaxPress,
  },
});

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useRoute: () => mockUseRoute(),
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const renderMaxInputModal = () =>
  renderScreen(MaxInputModal, { name: Routes.STAKING.MODALS.MAX_INPUT });

describe('MaxInputModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderMaxInputModal();
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls handleMaxPress when "Use max" button is pressed', () => {
    const { getByText } = renderMaxInputModal();

    // Press the "Use Max" button
    const useMaxButton = getByText('Use max');
    fireEvent.press(useMaxButton);

    // Check if handleMaxPress was called
    expect(mockHandleMaxPress).toHaveBeenCalledTimes(1);
  });

  it('closes the BottomSheet when "Cancel" button is pressed', () => {
    const { getByText } = renderMaxInputModal();

    // Press the "Cancel" button
    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    // Check if the BottomSheet's close function was called
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('closes the BottomSheet when "Use Max" button is pressed', () => {
    const { getByText } = renderMaxInputModal();

    // Press the "Use Max" button
    const useMaxButton = getByText('Use max');
    fireEvent.press(useMaxButton);

    // Check if the BottomSheet's close function was called
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('displays the correct content when asset is ETH', () => {
    const { queryByText } = renderMaxInputModal();

    const ethDescriptionText = queryByText(
      strings('stake.max_modal.eth.description'),
    );
    expect(ethDescriptionText).toBeTruthy();
  });
});
