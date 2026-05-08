import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import BenefitsPreview from './BenefitsPreview';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectBenefits,
  selectBenefitsLoading,
} from '../../../../../reducers/rewards/selectors';

const mockNavigate = jest.fn();
const mockUseSelector = jest.fn();
const mockUseBenefits = jest.fn();

const mockStrings = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'rewards.benefits.title': 'Benefits',
    'rewards.benefits.empty-list': 'No benefits available yet',
  };
  return translations[key] || key;
});

interface TestBenefit {
  id: number;
  longTitle: string;
  shortDescription: string;
}

let mockBenefits: TestBenefit[] = [];
let mockLoading = false;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../hooks/useBenefits', () => ({
  useBenefits: () => mockUseBenefits(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => mockStrings(key),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    Skeleton: () =>
      ReactActual.createElement(View, { testID: 'benefits-preview-skeleton' }),
  };
});

jest.mock('./BenefitCard', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ benefit }: { benefit: TestBenefit }) =>
      ReactActual.createElement(
        Text,
        { testID: `benefit-card-${benefit.id}` },
        benefit.longTitle,
      ),
  };
});

jest.mock('./BenefitEmptyList', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');
      return ReactActual.createElement(
        Text,
        { testID: 'benefit-empty-list' },
        strings('rewards.benefits.empty-list'),
      );
    },
  };
});

describe('BenefitsPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBenefits = [];
    mockLoading = false;
    mockUseBenefits.mockReturnValue({ getAllBenefits: jest.fn() });
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectBenefits) {
        return mockBenefits;
      }
      if (selector === selectBenefitsLoading) {
        return mockLoading;
      }
      return undefined;
    });
  });

  it('renders top benefit section testID', () => {
    const { getByTestId } = render(<BenefitsPreview />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION),
    ).toBeOnTheScreen();
  });

  it('calls useBenefits on mount', () => {
    render(<BenefitsPreview />);

    expect(mockUseBenefits).toHaveBeenCalledTimes(1);
  });

  it('requests rewards benefits title copy from i18n', () => {
    render(<BenefitsPreview />);

    expect(mockStrings).toHaveBeenCalledWith('rewards.benefits.title');
  });

  it('reads subscription benefits and loading state from the store', () => {
    render(<BenefitsPreview />);

    expect(mockUseSelector).toHaveBeenCalledWith(selectBenefits);
    expect(mockUseSelector).toHaveBeenCalledWith(selectBenefitsLoading);
  });

  describe('loading', () => {
    it('renders skeleton and hides empty list while benefits are loading', () => {
      mockLoading = true;

      const { getByTestId, queryByTestId } = render(<BenefitsPreview />);

      expect(getByTestId('benefits-preview-skeleton')).toBeOnTheScreen();
      expect(queryByTestId('benefit-empty-list')).toBeNull();
    });

    it('renders skeleton instead of benefit cards when benefits exist but loading is true', () => {
      mockBenefits = [
        { id: 1, longTitle: 'One', shortDescription: 'a' },
        { id: 2, longTitle: 'Two', shortDescription: 'b' },
      ];
      mockLoading = true;

      const { getByTestId, queryByTestId } = render(<BenefitsPreview />);

      expect(getByTestId('benefits-preview-skeleton')).toBeOnTheScreen();
      expect(queryByTestId('benefit-card-1')).toBeNull();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS),
      ).toBeNull();
    });
  });

  describe('empty state', () => {
    it('renders BenefitEmptyList when there are no benefits and loading is false', () => {
      const { getByTestId, getByText } = render(<BenefitsPreview />);

      expect(getByTestId('benefit-empty-list')).toBeOnTheScreen();
      expect(getByText('No benefits available yet')).toBeOnTheScreen();
      expect(mockStrings).toHaveBeenCalledWith('rewards.benefits.empty-list');
    });

    it('does not render benefit details container without benefits', () => {
      const { queryByTestId } = render(<BenefitsPreview />);

      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS),
      ).toBeNull();
    });
  });

  describe('with benefits', () => {
    beforeEach(() => {
      mockBenefits = [
        { id: 1, longTitle: 'Benefit One', shortDescription: 'One' },
        { id: 2, longTitle: 'Benefit Two', shortDescription: 'Two' },
      ];
    });

    it('renders benefit details container and benefit cards', () => {
      const { getByTestId, getByText } = render(<BenefitsPreview />);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS),
      ).toBeOnTheScreen();
      expect(getByText('Benefit One')).toBeOnTheScreen();
      expect(getByText('Benefit Two')).toBeOnTheScreen();
    });

    it('limits preview to the first three benefits', () => {
      mockBenefits = [
        { id: 1, longTitle: 'B1', shortDescription: 'a' },
        { id: 2, longTitle: 'B2', shortDescription: 'b' },
        { id: 3, longTitle: 'B3', shortDescription: 'c' },
        { id: 4, longTitle: 'B4', shortDescription: 'd' },
      ];

      const { getByText, queryByText } = render(<BenefitsPreview />);

      expect(getByText('B1')).toBeOnTheScreen();
      expect(getByText('B2')).toBeOnTheScreen();
      expect(getByText('B3')).toBeOnTheScreen();
      expect(queryByText('B4')).toBeNull();
    });

    it('navigates to the full benefits view when the header row is pressed', () => {
      const { getByText } = render(<BenefitsPreview />);

      fireEvent.press(getByText('Benefits'));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARD_BENEFITS_FULL_VIEW,
      );
    });
  });

  describe('header without benefits', () => {
    it('does not navigate when the title is pressed and the list is empty', () => {
      const { getByText } = render(<BenefitsPreview />);

      fireEvent.press(getByText('Benefits'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
