import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import BenefitFullView from './BenefitFullView';
import Routes from '../../../../constants/navigation/Routes';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import { formatDateRemaining } from '../utils/formatUtils';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockPostBenefitImpression = jest.fn().mockResolvedValue(undefined);
const mockUseSelector = jest.fn();
const mockFormatDateRemaining = formatDateRemaining as jest.MockedFunction<
  typeof formatDateRemaining
>;
const mockStrings = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'rewards.benefits.title_claim': 'Claim benefit',
    'rewards.benefits.action': 'Claim now',
  };
  return translations[key] || key;
});

const mockBenefit = {
  id: 1,
  longTitle: 'Premium Benefit',
  shortDescription: 'Short description',
  longDescription: 'Long description',
  thumbnail: 'https://example.com/thumb.png',
  validFrom: '2026-01-01T00:00:00Z',
  validTo: '2026-12-31T23:59:59Z',
  url: 'https://benefits.example.com/claim',
  actionDate: '2026-12-30T00:00:00Z',
  chain: 'ethereum',
  type: { id: 7, name: 'Partner' },
};
let mockRouteBenefit = mockBenefit;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {
      benefit: mockRouteBenefit,
    },
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockPostBenefitImpression(...args),
    },
  },
}));

jest.mock('../utils/formatUtils', () => ({
  ...jest.requireActual('../utils/formatUtils'),
  formatDateRemaining: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Pressable, Text, View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ title, onBack }: { title: string; onBack: () => void }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'header-back-button',
          }),
        ),
    };
  },
);

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      testID,
    }: React.PropsWithChildren<{ testID?: string }>) =>
      ReactActual.createElement(View, { testID }, children),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => mockStrings(key),
}));

describe('BenefitFullView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteBenefit = mockBenefit;
    mockUseSelector.mockReturnValue('subscription-123');
    mockFormatDateRemaining.mockReturnValue('1m 3d');
  });

  it('renders title, description, and action button', () => {
    const { getByText, getByTestId } = render(<BenefitFullView />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.DETAIL_BENEFIT_VIEW),
    ).toBeOnTheScreen();
    expect(getByText('Claim benefit')).toBeOnTheScreen();
    expect(getByText('Premium Benefit')).toBeOnTheScreen();
    expect(getByText('Long description')).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.DETAIL_BENEFIT_ACTION),
    ).toBeOnTheScreen();
    expect(getByText('1m 3d')).toBeOnTheScreen();
    expect(mockStrings).toHaveBeenCalledWith('rewards.benefits.title_claim');
    expect(mockStrings).toHaveBeenCalledWith('rewards.benefits.action');
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = render(<BenefitFullView />);

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('posts benefit impression on mount when subscription exists', async () => {
    render(<BenefitFullView />);

    await waitFor(() => {
      expect(mockPostBenefitImpression).toHaveBeenCalledWith(
        'RewardsController:postBenefitImpression',
        'subscription-123',
        mockBenefit.id,
        mockBenefit.type.id,
      );
    });
  });

  it('does not post benefit impression when subscription is missing', async () => {
    mockUseSelector.mockReturnValue(null);

    render(<BenefitFullView />);

    await waitFor(() => {
      expect(mockPostBenefitImpression).not.toHaveBeenCalled();
    });
  });

  it('navigates to browser when claim action is pressed and url exists', () => {
    const { getByTestId } = render(<BenefitFullView />);

    fireEvent.press(getByTestId(REWARDS_VIEW_SELECTORS.DETAIL_BENEFIT_ACTION));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: mockBenefit.url,
        timestamp: expect.any(Number),
      },
    });
  });

  it('does not navigate when claim action is pressed and url is missing', () => {
    mockRouteBenefit = { ...mockBenefit, url: '' };

    const { getByTestId } = render(<BenefitFullView />);

    fireEvent.press(getByTestId(REWARDS_VIEW_SELECTORS.DETAIL_BENEFIT_ACTION));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('hides remaining time when formatter returns null', () => {
    mockFormatDateRemaining.mockReturnValue(null);

    const { queryByText } = render(<BenefitFullView />);

    expect(queryByText('1m 3d')).toBeNull();
  });
});
