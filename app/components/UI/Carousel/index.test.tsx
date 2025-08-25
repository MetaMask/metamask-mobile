import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  userEvent,
} from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Linking } from 'react-native';
import Carousel from './';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { backgroundState } from '../../../util/test/initial-root-state';
import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import Engine from '../../../core/Engine';
import { PREDEFINED_SLIDES } from './constants';
import { fetchCarouselSlidesFromContentful } from './fetchCarouselSlidesFromContentful';
import { CarouselSlide } from './types';
// eslint-disable-next-line import/no-namespace
import * as FeatureFlagSelectorsModule from './selectors/featureFlags';
import { RootState } from '../../../reducers';
import { AccountsControllerState } from '@metamask/accounts-controller';

jest.mock('../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: jest.fn(),
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
  getTotalEvmFiatAccountBalance: jest.fn(),
  setSelectedAddress: jest.fn(),
  context: {
    PreferencesController: {
      state: {},
    },
  },
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        alternative: '#F2F4F6',
        alternativePressed: '#E7E9EB',
        default: '#FFFFFF',
      },
      border: {
        muted: '#BBC0C5',
      },
      icon: {
        default: '#24272A',
        muted: '#BBC0C5',
      },
      text: {
        default: '#24272A',
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

// Mock useMultichainBalances hook
jest.mock('../../../components/hooks/useMultichainBalances', () => ({
  useSelectedAccountMultichainBalances: jest.fn().mockReturnValue({
    selectedAccountMultichainBalance: {
      displayBalance: '$0.00',
      displayCurrency: 'USD',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [],
      shouldShowAggregatedPercentage: false,
      isPortfolioVieEnabled: true,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
  }),
}));

// Mock contentful slides
jest.mock('./fetchCarouselSlidesFromContentful', () => ({
  ...jest.requireActual('./fetchCarouselSlidesFromContentful'),
  fetchCarouselSlidesFromContentful: jest.fn(),
}));

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const setupMocks = ({
  dismissedBanners = [] as string[],
  prioritySlides = [] as CarouselSlide[],
  regularSlides = [] as CarouselSlide[],
} = {}) => {
  const mockSelectContentfulCarouselEnabledFlag = jest
    .spyOn(FeatureFlagSelectorsModule, 'selectContentfulCarouselEnabledFlag')
    .mockReturnValue(false);

  const mockState = {
    banners: {
      dismissedBanners,
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
  } as unknown as RootState;

  (useSelector as jest.Mock).mockImplementation((selector) =>
    selector(mockState),
  );

  const mockFetchCarouselSlidesFromContentful = jest
    .mocked(fetchCarouselSlidesFromContentful)
    .mockResolvedValue({
      prioritySlides,
      regularSlides,
    });

  (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
  jest.clearAllMocks();

  return {
    mockSelectContentfulCarouselEnabledFlag,
    mockFetchCarouselSlidesFromContentful,
    mockState,
  };
};

describe('Carousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('render an expected snapshot', () => {
    const { toJSON } = render(<Carousel />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('opens correct URLs or navigates to correct screens when banners are clicked', async () => {
    const { getByTestId } = render(<Carousel />);
    const { CAROUSEL_SLIDE } = WalletViewSelectorsIDs;
    const slides = PREDEFINED_SLIDES.map((slide) =>
      getByTestId(CAROUSEL_SLIDE(slide.id)),
    );
    const [
      firstSlide,
      secondSlide,
      thirdSlide,
      fourthSlide,
      fifthSlide,
      sixthSlide,
      seventhSlide,
      eighthSlide,
    ] = slides;

    // Test solana banner
    fireEvent.press(firstSlide);
    expect(mockNavigate).toHaveBeenCalled();

    // Test smart account
    fireEvent.press(secondSlide);
    expect(mockNavigate).toHaveBeenCalled();

    // Test card banner
    fireEvent.press(thirdSlide);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://portfolio.metamask.io/card',
    );

    // Test fund banner
    fireEvent.press(fourthSlide);
    expect(mockNavigate).toHaveBeenCalled();

    // Test cashout banner
    fireEvent.press(fifthSlide);
    expect(mockNavigate).toHaveBeenCalled();

    // Test aggregated banner
    fireEvent.press(sixthSlide);
    expect(mockNavigate).toHaveBeenCalled();

    // Test multisrp banner
    fireEvent.press(seventhSlide);
    expect(mockNavigate).toHaveBeenCalled();

    // Test backup and sync banner
    fireEvent.press(eighthSlide);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should update selected index when scrolling', () => {
    const { getByTestId } = render(<Carousel />);
    const flatList = getByTestId(WalletViewSelectorsIDs.CAROUSEL_CONTAINER);

    fireEvent.scroll(flatList, {
      nativeEvent: {
        contentOffset: { x: 400 },
        layoutMeasurement: { width: 400 },
        contentSize: { width: 1600, height: 400 },
        target: flatList,
      },
    });

    expect(flatList).toBeOnTheScreen();
  });

  it('does not render solana banner if user has a solana account', () => {
    const { mockState } = setupMocks();
    mockState.engine.backgroundState.AccountsController = {
      internalAccounts: {
        selectedAccount: '1',
        accounts: {
          '1': {
            address: '0xSomeAddress',
            type: SolAccountType.DataAccount,
          },
        },
      },
    } as unknown as AccountsControllerState;

    const { queryByTestId } = render(<Carousel />);
    const solanaBanner = queryByTestId(
      WalletViewSelectorsIDs.CAROUSEL_SLIDE('solana'),
    );

    expect(solanaBanner).not.toBeOnTheScreen();
  });

  it('changes to a solana address if user has a solana account', async () => {
    const { mockState } = setupMocks();
    mockState.engine.backgroundState.AccountsController = {
      internalAccounts: {
        selectedAccount: '1',
        accounts: {
          '1': {
            address: '0xSomeAddress',
          },
          '2': {
            address: 'SomeSolanaAddress',
            type: SolAccountType.DataAccount,
          },
        },
      },
    } as unknown as AccountsControllerState;

    const { getByTestId } = render(<Carousel />);
    const solanaBanner = getByTestId(
      WalletViewSelectorsIDs.CAROUSEL_SLIDE('solana'),
    );
    await userEvent.press(solanaBanner);

    expect(Engine.setSelectedAddress).toHaveBeenCalledWith('SomeSolanaAddress');
  });

  it('smart account upgrade banner should not be shown if solana account is selected', async () => {
    const { mockState } = setupMocks();
    mockState.engine.backgroundState.AccountsController = {
      internalAccounts: {
        selectedAccount: '1',
        accounts: {
          '1': {
            address: 'SomeSolanaAddress',
            type: SolAccountType.DataAccount,
          },
          '2': {
            address: '0xSomeAddress',
            type: EthAccountType.Eoa,
          },
        },
      },
    } as unknown as AccountsControllerState;

    const { queryByTestId } = render(<Carousel />);
    expect(
      queryByTestId(WalletViewSelectorsIDs.CAROUSEL_SLIDE('smartAccount')),
    ).toBeNull();
  });

  it('smart account upgrade banner should be shown if EVM account is selected', async () => {
    const { mockState } = setupMocks();
    mockState.engine.backgroundState.AccountsController = {
      internalAccounts: {
        selectedAccount: '2',
        accounts: {
          '1': {
            address: 'SomeSolanaAddress',
            type: SolAccountType.DataAccount,
          },
          '2': {
            address: '0xSomeAddress',
            type: EthAccountType.Eoa,
          },
        },
      },
    } as unknown as AccountsControllerState;

    const { getByTestId } = render(<Carousel />);
    expect(
      getByTestId(WalletViewSelectorsIDs.CAROUSEL_SLIDE('smartAccount')),
    ).toBeTruthy();
  });
});

describe('Carousel with dynamic banners', () => {
  const mockPrioritySlides: CarouselSlide[] = [
    {
      id: 'contentful-priority-1',
      title: 'Priority Slide 1',
      description: 'This is a priority slide from Contentful',
      navigation: { type: 'url', href: 'https://example.com/priority' },
      image: 'https://example.com/priority-image.jpg',
      undismissable: true,
    },
  ];

  const mockRegularSlides: CarouselSlide[] = [
    {
      id: 'contentful-regular-1',
      title: 'Regular Slide 1',
      description: 'This is a regular slide from Contentful',
      navigation: { type: 'url', href: 'https://example.com/regular' },
      image: 'https://example.com/regular-image.jpg',
      undismissable: false,
    },
  ];

  const arrange = (...args: Parameters<typeof setupMocks>) => {
    const mocks = setupMocks(...args);
    mocks.mockSelectContentfulCarouselEnabledFlag.mockReturnValue(true);
    return mocks;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    arrange();
  });

  it('renders Contentful priority and regular slides', async () => {
    const banners = ['contentful-priority-1', 'contentful-regular-1'];
    const { mockFetchCarouselSlidesFromContentful } = arrange({
      prioritySlides: mockPrioritySlides,
      regularSlides: mockRegularSlides,
    });

    const { findByTestId } = render(<Carousel />);

    await waitFor(() => {
      expect(mockFetchCarouselSlidesFromContentful).toHaveBeenCalled();
    });

    banners.forEach(async (bannerId) => {
      expect(
        await findByTestId(WalletViewSelectorsIDs.CAROUSEL_SLIDE(bannerId)),
      ).toBeOnTheScreen();
    });
  });

  it('does not render dismissed Contentful slides', async () => {
    const dismissedBanners = ['contentful-priority-1', 'contentful-regular-1'];
    const { mockFetchCarouselSlidesFromContentful } = arrange({
      dismissedBanners,
      prioritySlides: mockPrioritySlides,
      regularSlides: mockRegularSlides,
    });

    const { queryByTestId } = render(<Carousel />);

    await waitFor(() => {
      expect(mockFetchCarouselSlidesFromContentful).toHaveBeenCalled();
    });

    dismissedBanners.forEach((bannerId) => {
      expect(
        queryByTestId(WalletViewSelectorsIDs.CAROUSEL_SLIDE(bannerId)),
      ).not.toBeOnTheScreen();
    });
  });

  it('opens the correct URL when a Contentful slide is clicked', async () => {
    arrange({
      prioritySlides: mockPrioritySlides,
      regularSlides: mockRegularSlides,
    });

    const { findByTestId } = render(<Carousel />);

    // Click on the priority slide
    const prioritySlide = await findByTestId(
      WalletViewSelectorsIDs.CAROUSEL_SLIDE('contentful-priority-1'),
    );
    await userEvent.press(prioritySlide);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://example.com/priority',
    );

    // Click on the regular slide
    const regularSlide = await findByTestId(
      WalletViewSelectorsIDs.CAROUSEL_SLIDE('contentful-regular-1'),
    );
    await userEvent.press(regularSlide);

    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/regular');
  });

  it('dismisses a Contentful slide when the close button is clicked', async () => {
    arrange({
      prioritySlides: mockPrioritySlides,
      regularSlides: mockRegularSlides,
    });

    const { findByTestId } = render(<Carousel />);

    const closeButton = await findByTestId(
      WalletViewSelectorsIDs.CAROUSEL_SLIDE_CLOSE_BUTTON(
        'contentful-regular-1',
      ),
    );
    await userEvent.press(closeButton);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'banners/dismissBanner',
        payload: 'contentful-regular-1',
      }),
    );
  });
});
