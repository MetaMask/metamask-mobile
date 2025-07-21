import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderDepositTestComponent from '../../../utils/renderDepositTestComponent';
import UnsupportedStateModal from './UnsupportedStateModal';
import Routes from '../../../../../../../constants/navigation/Routes';

const mockUseDepositSDK = jest.fn();
const mockNavigate = jest.fn();
const mockDangerouslyGetParent = jest.fn();
const mockPop = jest.fn();

jest.mock('../../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
  DepositSDKProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      dangerouslyGetParent: mockDangerouslyGetParent,
    }),
  };
});

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: jest.fn(() => ({})),
}));

jest.mock('../StateSelectorModal', () => ({
  createStateSelectorModalNavigationDetails: jest.fn(() => ['StateSelectorModal']),
}));

describe('UnsupportedStateModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render match snapshot', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: {
        isoCode: 'US',
        flag: '🇺🇸',
        name: 'United States',
        phone: {
          prefix: '+1',
          placeholder: '(555) 123-4567',
          template: '(XXX) XXX-XXXX',
        },
        currency: 'USD',
        supported: true,
      },
    });

    const { toJSON } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to state selector when Change state button is pressed', () => {
    const mockSelectedRegion = {
      isoCode: 'US',
      flag: '🇺🇸',
      name: 'United States',
      phone: {
        prefix: '+1',
        placeholder: '(555) 123-4567',
        template: '(XXX) XXX-XXXX',
      },
      currency: 'USD',
      supported: true,
    };

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    const changeStateButton = getByText('Change state');
    fireEvent.press(changeStateButton);

    expect(mockNavigate).toHaveBeenCalledWith('StateSelectorModal');
  });

  it('navigates to home when Go Home button is pressed', () => {
    const mockSelectedRegion = {
      isoCode: 'US',
      flag: '🇺🇸',
      name: 'United States',
      phone: {
        prefix: '+1',
        placeholder: '(555) 123-4567',
        template: '(XXX) XXX-XXXX',
      },
      currency: 'USD',
      supported: true,
    };

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    const goHomeButton = getByText('Go Home');
    fireEvent.press(goHomeButton);

    expect(mockNavigate).toHaveBeenCalledWith('WalletTabHome', {
      screen: 'WalletTabStackFlow',
      params: {
        screen: 'WalletView',
      },
    });
  });

  it('handles missing region gracefully', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: null,
    });

    const { toJSON } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    expect(toJSON()).toMatchSnapshot();
  });
}); 