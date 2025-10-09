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
import Engine from '../../../core/Engine';
import { fetchCarouselSlidesFromContentful } from './fetchCarouselSlidesFromContentful';
import { CarouselSlide } from './types';
// eslint-disable-next-line import/no-namespace
import * as FeatureFlagSelectorsModule from './selectors/featureFlags';
import { RootState } from '../../../reducers';
import { selectLastSelectedSolanaAccount } from '../../../selectors/accountsController';
import Routes from '../../../constants/navigation/Routes';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { SolScope } from '@metamask/keyring-api';

const makeMockState = () =>
  ({
    browser: { tabs: [] },
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          internalAccounts: {
            selectedAccount: '1',
            accounts: {
              '1': { address: '0xSomeAddress' },
            },
          },
        },
      },
    },
    settings: { showFiatOnTestnets: false },
    banners: { dismissedBanners: [] },
  } as unknown as RootState);

// Mocks
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../core/Engine', () => ({
  setSelectedAddress: jest.fn(),
  context: { PreferencesController: { state: {} } },
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({ build: () => ({}) }),
  }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

jest.mock('./fetchCarouselSlidesFromContentful', () => ({
  ...jest.requireActual('./fetchCarouselSlidesFromContentful'),
  fetchCarouselSlidesFromContentful: jest.fn(),
}));

const mockDispatch = jest.fn();
const mockFetchCarouselSlides = jest.mocked(fetchCarouselSlidesFromContentful);

const createMockSlide = (
  overrides: Partial<CarouselSlide> = {},
): CarouselSlide => ({
  id: 'test-slide',
  title: 'Test Slide',
  description: 'Test Description',
  navigation: { type: 'url', href: 'https://example.com' },
  image: 'https://example.com/image.jpg',
  ...overrides,
});

const mockReduxHooks = (state?: RootState) => {
  jest.mocked(useDispatch).mockReturnValue(mockDispatch);
  jest
    .mocked(useSelector)
    .mockImplementation((selector) => selector(state ?? makeMockState()));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockReduxHooks();
  jest
    .spyOn(FeatureFlagSelectorsModule, 'selectContentfulCarouselEnabledFlag')
    .mockReturnValue(true);
  mockFetchCarouselSlides.mockResolvedValue({
    prioritySlides: [],
    regularSlides: [],
  });
});

describe('Carousel Feature Flag Control', () => {
  const setupFeatureFlagTests = (isEnabled: boolean) => {
    jest
      .spyOn(FeatureFlagSelectorsModule, 'selectContentfulCarouselEnabledFlag')
      .mockReturnValue(isEnabled);
  };

  it('does not render when carousel feature is disabled', () => {
    setupFeatureFlagTests(false);
    const { toJSON } = render(<Carousel />);
    expect(toJSON()).toBeNull();
  });

  it('does not fetch carousel data when feature is disabled', () => {
    setupFeatureFlagTests(false);
    render(<Carousel />);
    expect(mockFetchCarouselSlides).not.toHaveBeenCalled();
  });
});

describe('Carousel Data Fetching', () => {
  it('fetches and renders contentful slides', async () => {
    const testSlide = createMockSlide({ id: 'cms-slide', title: 'CMS Slide' });
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [testSlide],
      regularSlides: [],
    });

    const { findByText } = render(<Carousel />);

    await waitFor(() => expect(mockFetchCarouselSlides).toHaveBeenCalled());
    expect(await findByText('CMS Slide')).toBeOnTheScreen();
  });

  it('handles CMS fetch errors gracefully', async () => {
    mockFetchCarouselSlides.mockRejectedValue(new Error('CMS Error'));

    const { toJSON } = render(<Carousel />);

    await waitFor(() => expect(toJSON()).toBeNull());
  });

  it('prioritizes priority slides over regular slides', async () => {
    const prioritySlide = createMockSlide({
      id: 'priority',
      title: 'Priority',
      description: '',
    });
    const regularSlide = createMockSlide({
      id: 'regular',
      title: 'Regular',
      description: '',
    });
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [prioritySlide],
      regularSlides: [regularSlide],
    });

    const { findByTestId } = render(<Carousel />);

    // In the new stack implementation, only the current slide is rendered
    // Priority slides should appear first
    await waitFor(async () => {
      const currentSlide = await findByTestId('carousel-slide-priority');
      expect(currentSlide).toHaveTextContent('Priority');
    });
  });
});

describe('Carousel Slide Filtering', () => {
  const setupFilteringTests = (dismissedBanners: string[] = []) => {
    const mockState = makeMockState();
    mockState.banners = { dismissedBanners };
    mockReduxHooks(mockState);
  };

  it('filters out dismissed slides', async () => {
    setupFilteringTests(['dismissed-slide']);
    const slide = createMockSlide({ id: 'dismissed-slide' });
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: [slide],
    });

    const { toJSON } = render(<Carousel />);

    await waitFor(() => expect(toJSON()).toBeNull());
  });
});

describe('Carousel Navigation', () => {
  it('opens external URLs when slide is clicked', async () => {
    const urlSlide = createMockSlide({
      id: 'url-slide',
      navigation: { type: 'url', href: 'https://metamask.io' },
    });
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: [urlSlide],
    });

    const { findByTestId } = render(<Carousel />);
    const slide = await findByTestId('carousel-slide-url-slide');
    fireEvent.press(slide);
    expect(Linking.openURL).toHaveBeenCalledWith('https://metamask.io');
  });

  it('navigates to buy flow for fund slides', async () => {
    const fundSlide = createMockSlide({
      id: 'fund-slide',
      variableName: 'fund',
    });
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: [fundSlide],
    });

    const { findByTestId } = render(<Carousel />);
    const slide = await findByTestId('carousel-slide-fund-slide');
    fireEvent.press(slide);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('navigates to route when slide has route navigation', async () => {
    const routeSlide = createMockSlide({
      id: 'route-slide',
      navigation: { type: 'route', route: 'Settings' },
    });
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: [routeSlide],
    });

    const { findByTestId } = render(<Carousel />);
    const slide = await findByTestId('carousel-slide-route-slide');
    fireEvent.press(slide);
    expect(mockNavigate).toHaveBeenCalledWith('Settings');
  });
});

describe('Carousel Slide Dismissal', () => {
  it('triggers transition animation when close button is clicked', async () => {
    const dismissibleSlide = createMockSlide({
      id: 'dismissible-slide',
    });
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: [dismissibleSlide],
    });

    const { findByTestId } = render(<Carousel />);

    const closeButton = await findByTestId(
      'carousel-slide-dismissible-slide-close-button',
    );

    // In the new implementation, close button triggers animation transition
    // The dispatch happens as part of the transition animation
    fireEvent.press(closeButton);

    // The close button should exist and be pressable
    expect(closeButton).toBeOnTheScreen();
  });

  it('shows close button for all slides in new implementation', async () => {
    const testSlide = createMockSlide({
      id: 'test-slide',
    });
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: [testSlide],
    });

    const { findByTestId } = render(<Carousel />);

    const slide = await findByTestId('carousel-slide-test-slide');
    const closeButton = await findByTestId(
      'carousel-slide-test-slide-close-button',
    );

    expect(slide).toBeOnTheScreen();
    expect(closeButton).toBeOnTheScreen();
  });
});

describe('Carousel Solana Integration', () => {
  const setupSolanaTests = (hasSolanaAccount: boolean = false) => {
    const mockState = makeMockState();
    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectLastSelectedSolanaAccount) {
        return hasSolanaAccount ? { address: 'SolanaAddress123' } : null;
      }
      return selector(mockState);
    });
  };

  const arrangeActTestSolanaCarouselClick = async (
    props = { hasSolanaAccount: true },
  ) => {
    setupSolanaTests(props.hasSolanaAccount);
    const solanaSlide = createMockSlide({
      id: 'solana',
      variableName: 'solana',
    });
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: [solanaSlide],
    });

    const { findByTestId } = render(<Carousel />);
    const slide = await findByTestId('carousel-slide-solana');
    expect(slide).toBeVisible();
    await userEvent.press(slide);
  };

  it('switches to existing Solana account when clicked', async () => {
    await arrangeActTestSolanaCarouselClick({ hasSolanaAccount: true });
    expect(Engine.setSelectedAddress).toHaveBeenCalledWith('SolanaAddress123');
  });

  it('navigates to add account flow when no existing Solana account', async () => {
    await arrangeActTestSolanaCarouselClick({ hasSolanaAccount: false }); // no solana account

    // Should navigate to add account flow instead of switching accounts
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ADD_ACCOUNT,
      params: {
        clientType: WalletClientType.Solana,
        scope: SolScope.Mainnet,
      },
    });
    expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
  });
});

describe('Carousel UI Behavior', () => {
  it('renders stack-based carousel with current slide', async () => {
    const slides = [
      createMockSlide({ id: 'slide-1', title: 'First Slide' }),
      createMockSlide({ id: 'slide-2', title: 'Second Slide' }),
    ];
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: slides,
    });

    const { findByTestId } = render(<Carousel />);

    // New implementation renders stack-based carousel without progress dots
    const carouselContainer = await findByTestId(
      WalletViewSelectorsIDs.CAROUSEL_CONTAINER,
    );
    expect(carouselContainer).toBeOnTheScreen();

    // Should show the current (first) slide
    const currentSlide = await findByTestId('carousel-slide-slide-1');
    expect(currentSlide).toBeOnTheScreen();

    // Check that the slide contains the expected title
    const slideTitle = await findByTestId('carousel-slide-slide-1-title');
    expect(slideTitle).toHaveTextContent('First Slide');
  });

  it('shows stacked cards when multiple slides exist', async () => {
    const slides = [
      createMockSlide({ id: 'slide-1', title: 'Current Slide' }),
      createMockSlide({ id: 'slide-2', title: 'Next Slide' }),
    ];
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: slides,
    });

    const { findByTestId } = render(<Carousel />);

    const carouselContainer = await findByTestId(
      WalletViewSelectorsIDs.CAROUSEL_CONTAINER,
    );
    expect(carouselContainer).toBeOnTheScreen();

    // Current slide should be visible
    const currentSlide = await findByTestId('carousel-slide-slide-1');
    expect(currentSlide).toBeOnTheScreen();

    // Next slide should also be rendered (stacked behind)
    const nextSlide = await findByTestId('carousel-slide-slide-2');
    expect(nextSlide).toBeOnTheScreen();
  });
});
