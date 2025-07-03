import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import UnsupportedRegionModal from './UnsupportedRegionModal';
import renderDepositTestComponent from '../../../utils/renderDepositTestComponent';
import Routes from '../../../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockUseDepositSDK = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
  DepositSDKProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails: jest.fn((params: Record<string, unknown>) => [
    'DepositModals',
    'DepositUnsupportedRegionModal',
    params,
  ]),
}));

jest.mock('../RegionSelectorModal', () => ({
  createRegionSelectorModalNavigationDetails: jest.fn(() => [
    'DepositModals',
    'DepositRegionSelectorModal',
    {},
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

  it('navigates to buy screen when Buy Crypto button is pressed', () => {
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

    expect(mockNavigate).toHaveBeenCalledWith(
      'DepositModals',
      'DepositRegionSelectorModal',
      {},
    );
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
