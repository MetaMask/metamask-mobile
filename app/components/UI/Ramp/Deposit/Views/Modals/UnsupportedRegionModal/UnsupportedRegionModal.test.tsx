import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import UnsupportedRegionModal from './UnsupportedRegionModal';
import renderDepositTestComponent from '../../../utils/renderDepositTestComponent';
import Routes from '../../../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../../../util/navigation/navUtils';

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails: jest.fn((params: Record<string, unknown>) => [
    'DepositModals',
    'DepositUnsupportedRegionModal',
    params,
  ]),
}));

jest.mock('../../../../utils/withRampAndDepositSDK', () =>
  jest.fn((Component) => (props: Record<string, unknown>) => (
    <Component {...props} />
  )),
);

describe('UnsupportedRegionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    mockUseParams.mockReturnValue({
      onExitToWalletHome: jest.fn(),
      onSelectDifferentRegion: jest.fn(),
    });

    const { toJSON } = renderDepositTestComponent(
      UnsupportedRegionModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onExitToWalletHome when exit to wallet home button is pressed', () => {
    const mockOnExitToWalletHome = jest.fn();
    mockUseParams.mockReturnValue({
      onExitToWalletHome: mockOnExitToWalletHome,
      onSelectDifferentRegion: jest.fn(),
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedRegionModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION,
    );

    const exitButton = getByText('Exit to wallet home');
    fireEvent.press(exitButton);

    expect(mockOnExitToWalletHome).toHaveBeenCalled();
  });

  it('calls onSelectDifferentRegion when select different region button is pressed', () => {
    const mockOnSelectDifferentRegion = jest.fn();
    mockUseParams.mockReturnValue({
      onExitToWalletHome: jest.fn(),
      onSelectDifferentRegion: mockOnSelectDifferentRegion,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedRegionModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION,
    );

    const selectRegionButton = getByText('Select a different region');
    fireEvent.press(selectRegionButton);

    expect(mockOnSelectDifferentRegion).toHaveBeenCalled();
  });

  it('handles missing callback functions gracefully', () => {
    mockUseParams.mockReturnValue({});

    const { toJSON } = renderDepositTestComponent(
      UnsupportedRegionModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION,
    );

    expect(toJSON()).toBeTruthy();
  });

  it('handles missing regionName gracefully', () => {
    mockUseParams.mockReturnValue({
      onExitToWalletHome: jest.fn(),
      onSelectDifferentRegion: jest.fn(),
    });

    const { toJSON } = renderDepositTestComponent(
      UnsupportedRegionModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION,
    );

    expect(toJSON()).toBeTruthy();
  });
});
