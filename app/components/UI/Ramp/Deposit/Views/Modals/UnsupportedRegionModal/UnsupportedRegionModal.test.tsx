import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import UnsupportedRegionModal from './UnsupportedRegionModal';
import renderDepositTestComponent from '../../../utils/renderDepositTestComponent';
import Routes from '../../../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockUseDepositSDK = jest.fn();
const mockGoBack = jest.fn();
const mockPop = jest.fn();
const mockDangerouslyGetParent = jest.fn(() => ({
  pop: mockPop,
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dangerouslyGetParent: mockDangerouslyGetParent,
    }),
  };
});

jest.mock('../../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
  DepositSDKProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('UnsupportedRegionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render match snapshot', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: {
        isoCode: 'BR',
        flag: '🇧🇷',
        name: 'Brazil',
        phone: {
          prefix: '+55',
          placeholder: '11 12345 6789',
          template: 'XX XXXXX XXXX',
        },
        currency: 'BRL',
        supported: false,
      },
    });

    const { toJSON } = renderDepositTestComponent(
      UnsupportedRegionModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('closes parent navigator and navigates to buy screen when Buy Crypto button is pressed', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: {
        isoCode: 'BR',
        flag: '🇧🇷',
        name: 'Brazil',
        phone: {
          prefix: '+55',
          placeholder: '11 12345 6789',
          template: 'XX XXXXX XXXX',
        },
        currency: 'BRL',
        supported: false,
      },
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedRegionModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION,
    );

    const buyCryptoButton = getByText('Buy Crypto');
    fireEvent.press(buyCryptoButton);

    expect(mockDangerouslyGetParent).toHaveBeenCalled();
    expect(mockPop).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('RampBuy');
  });

  it('navigates to region selector when Change region button is pressed', () => {
    const mockSelectedRegion = {
      isoCode: 'BR',
      flag: '🇧🇷',
      name: 'Brazil',
      phone: {
        prefix: '+55',
        placeholder: '11 12345 6789',
        template: 'XX XXXXX XXXX',
      },
      currency: 'BRL',
      supported: false,
    };

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedRegionModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION,
    );

    const changeRegionButton = getByText('Change region');
    fireEvent.press(changeRegionButton);

    expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
      screen: 'DepositRegionSelectorModal',
    });
  });

  it('handles missing region gracefully', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: null,
    });

    const { toJSON } = renderDepositTestComponent(
      UnsupportedRegionModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
