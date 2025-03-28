import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Linking } from 'react-native';
import Carousel from './';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { backgroundState } from '../../../util/test/initial-root-state';
import { lightTheme } from '@metamask/design-tokens';

jest.mock('../../../core/Engine', () => ({
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    TokensController: {
      ignoreTokens: jest.fn(() => Promise.resolve()),
    },
    PreferencesController: {
      setPrivacyMode: jest.fn(),
    },
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      state: {
        selectedNetworkClientId: 'mainnet',
      },
    },
    settings: {
      showFiatOnTestnets: true,
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../core/Engine', () => ({
  getTotalFiatAccountBalance: jest.fn(),
}));

const selectShowFiatInTestnets = jest.fn();

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        alternative: lightTheme.colors.background.alternative,
        alternativePressed: lightTheme.colors.background.alternativePressed,
        default: lightTheme.colors.background.default,
      },
      border: {
        muted: lightTheme.colors.border.muted,
      },
      icon: {
        default: lightTheme.colors.icon.default,
        muted: lightTheme.colors.icon.muted,
      },
      text: {
        default: lightTheme.colors.text.default,
      },
    },
  }),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      build: () => ({}),
    }),
  }),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

// Mock image requires
jest.mock('../../../images/banners/banner_image_card.png', () => ({
  uri: 'card-image',
}));
jest.mock('../../../images/banners/banner_image_fund.png', () => ({
  uri: 'fund-image',
}));
jest.mock('../../../images/banners/banner_image_cashout.png', () => ({
  uri: 'cashout-image',
}));
jest.mock('../../../images/banners/banner_image_aggregated.png', () => ({
  uri: 'aggregated-image',
}));

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('Carousel', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        banners: {
          dismissedBanners: [],
        },
        browser: {
          tabs: [],
        },
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: {
              internalAccounts: {
                selectedAccount: '1',
                accounts: {
                  '1': {
                    address: '0xSomeAddress',
                  },
                },
              },
            },
          },
        },
        settings: {
          showFiatOnTestnets: false,
        },
      }),
    );
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (selectShowFiatInTestnets as jest.Mock).mockReturnValue(false);
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = render(<Carousel />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should only render fund banner when all banners are dismissed', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        banners: {
          dismissedBanners: ['card', 'fund', 'cashout', 'aggregated'],
        },
        browser: {
          tabs: [],
        },
        engine: {
          backgroundState: {
            ...backgroundState,
            MultichainNetworkController: {
              ...backgroundState.MultichainNetworkController,
              isEvmSelected: false,
            },
          },
        },
        settings: {
          showFiatOnTestnets: false,
        },
      }),
    );

    const { toJSON } = render(<Carousel />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('opens correct URLs or navigates to correct screens when banners are clicked', async () => {
    const { getByTestId } = render(<Carousel />);

    const {
      CAROUSEL_FIRST_SLIDE,
      CAROUSEL_SECOND_SLIDE,
      CAROUSEL_THIRD_SLIDE,
      CAROUSEL_FOURTH_SLIDE,
    } = WalletViewSelectorsIDs;
    const firstSlide = getByTestId(CAROUSEL_FIRST_SLIDE);
    const secondSlide = getByTestId(CAROUSEL_SECOND_SLIDE);
    const thirdSlide = getByTestId(CAROUSEL_THIRD_SLIDE);
    const fourthSlide = getByTestId(CAROUSEL_FOURTH_SLIDE);

    // Test card banner
    fireEvent.press(firstSlide);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://portfolio.metamask.io/card',
    );

    // Test fund banner
    fireEvent.press(secondSlide);
    expect(mockNavigate).toHaveBeenCalled();

    // Test cashout banner
    fireEvent.press(thirdSlide);
    expect(mockNavigate).toHaveBeenCalled();

    // Test aggregated banner
    fireEvent.press(fourthSlide);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should update selected index when scrolling', () => {
    const { getByTestId } = render(<Carousel />);
    const flatList = getByTestId(WalletViewSelectorsIDs.CAROUSEL_CONTAINER);

    fireEvent.scroll(flatList, {
      nativeEvent: {
        contentOffset: { x: 400 },
        layoutMeasurement: { width: 400 },
      },
    });

    expect(flatList).toBeTruthy();
  });
});
