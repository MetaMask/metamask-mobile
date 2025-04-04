import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IpfsBanner from '.';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { TESTID_BANNER_CLOSE_BUTTON_ICON } from '../../../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('IpfsBanner', () => {
  const mockSetIpfsBannerVisible = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
  });

  it('should render banner correctly', () => {
    const { toJSON } = render(
      <IpfsBanner setIpfsBannerVisible={mockSetIpfsBannerVisible} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call setIpfsBannerVisible with false when banner is closed', () => {
    const { getByTestId } = render(
      <IpfsBanner setIpfsBannerVisible={mockSetIpfsBannerVisible} />,
    );

    const closeButton = getByTestId(TESTID_BANNER_CLOSE_BUTTON_ICON);
    fireEvent.press(closeButton);

    expect(mockSetIpfsBannerVisible).toHaveBeenCalledWith(false);
  });

  it('should navigate to IPFS settings when action button is pressed', () => {
    const { getByText } = render(
      <IpfsBanner setIpfsBannerVisible={mockSetIpfsBannerVisible} />,
    );

    const actionButton = getByText('Turn on IPFS gateway');
    fireEvent.press(actionButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SHOW_IPFS,
      params: {
        setIpfsBannerVisible: expect.any(Function),
      },
    });
  });
});
