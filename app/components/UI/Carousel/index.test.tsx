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
  undismissable: false,
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

    const { findAllByTestId } = render(<Carousel />);

    await waitFor(async () => {
      const slides = await findAllByTestId(/carousel-slide-/);
      expect(slides.length > 0).toBe(true);
      expect(slides[0]).toHaveTextContent('Priority');
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
  it('dispatches dismiss action when close button is clicked', async () => {
    const dismissibleSlide = createMockSlide({
      id: 'dismissible-slide',
      undismissable: false,
    });
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: [dismissibleSlide],
    });

    const { findByTestId } = render(<Carousel />);

    const closeButton = await findByTestId(
      'carousel-slide-dismissible-slide-close-button',
    );
    fireEvent.press(closeButton);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'banners/dismissBanner',
        payload: 'dismissible-slide',
      }),
    );
  });

  it('does not show close button for undismissable slides', async () => {
    const undismissableSlide = createMockSlide({
      id: 'undismissable-slide',
      undismissable: true,
    });
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: [undismissableSlide],
    });

    const { queryByTestId, findByTestId } = render(<Carousel />);

    expect(
      await findByTestId('carousel-slide-undismissable-slide'),
    ).toBeOnTheScreen();
    expect(
      queryByTestId('carousel-slide-undismissable-slide-close-button'),
    ).toBeNull();
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
  it('shows progress dots for multiple slides', async () => {
    const slides = [
      createMockSlide({ id: 'slide-1' }),
      createMockSlide({ id: 'slide-2' }),
    ];
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: slides,
    });

    const { findByTestId } = render(<Carousel />);

    expect(
      await findByTestId(WalletViewSelectorsIDs.CAROUSEL_PROGRESS_DOTS),
    ).toBeOnTheScreen();
  });

  it('updates scroll position when swiping', async () => {
    const slides = [
      createMockSlide({ id: 'slide-1' }),
      createMockSlide({ id: 'slide-2' }),
    ];
    mockFetchCarouselSlides.mockResolvedValue({
      prioritySlides: [],
      regularSlides: slides,
    });

    const { findByTestId } = render(<Carousel />);

    const flatList = await findByTestId(
      WalletViewSelectorsIDs.CAROUSEL_CONTAINER,
    );

    fireEvent(flatList, 'onMomentumScrollEnd', {
      nativeEvent: {
        contentOffset: { x: 400, y: 0 },
        layoutMeasurement: { width: 400, height: 66 },
        contentSize: { width: 800, height: 66 },
      },
    });

    expect(flatList).toBeOnTheScreen();
  });
});
