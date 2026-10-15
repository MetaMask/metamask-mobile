import React from 'react';
import { View } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import {
  Icon,
  IconName,
  SectionHeader,
} from '@metamask/design-system-react-native';
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

const mockStrings = jest.fn((key: string, params?: Record<string, unknown>) => {
  if (
    key === 'rewards.benefits.available_count' &&
    params &&
    typeof params.count === 'string'
  ) {
    return `${params.count} available`;
  }
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
let mockWindowWidth = 390;

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWindowWidth, height: 844 }),
}));

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
  strings: (key: string, params?: Record<string, unknown>) =>
    mockStrings(key, params),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn((...args: unknown[]) =>
    args.reduce<Record<string, unknown>>((style, arg) => {
      if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
        return { ...style, ...(arg as Record<string, unknown>) };
      }
      return style;
    }, {}),
  );
  return { useTailwind: () => tw };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    Skeleton: ({ style }: { style?: object }) =>
      ReactActual.createElement(View, {
        testID: 'benefits-preview-skeleton',
        style,
      }),
  };
});

jest.mock('./BenefitCard', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    BENEFIT_PREVIEW_CARD_WIDTH: 210,
    BENEFIT_PREVIEW_CARD_HEIGHT: 248,
    default: ({
      benefit,
      variant,
      disabled,
    }: {
      benefit: TestBenefit;
      variant?: 'preview';
      disabled?: boolean;
    }) =>
      ReactActual.createElement(
        Text,
        {
          testID: `benefit-card-${benefit.id}`,
          variant,
          disabled,
        },
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
    mockWindowWidth = 390;
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

    expect(mockStrings).toHaveBeenCalledWith(
      'rewards.benefits.title',
      undefined,
    );
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

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SKELETON),
      ).toBeOnTheScreen();
      expect(queryByTestId('benefit-empty-list')).toBeNull();
    });

    it('renders two peek-sized skeletons while benefits are loading', () => {
      mockLoading = true;

      const { getAllByTestId } = render(<BenefitsPreview />);

      const skeletons = getAllByTestId('benefits-preview-skeleton');

      expect(skeletons).toHaveLength(2);
      expect(skeletons[0].props.style).toEqual({ width: 210, height: 248 });
      expect(skeletons[1].props.style).toEqual({ width: 210, height: 248 });
    });

    it('renders skeleton instead of benefit cards when benefits exist but loading is true', () => {
      mockBenefits = [
        { id: 1, longTitle: 'One', shortDescription: 'a' },
        { id: 2, longTitle: 'Two', shortDescription: 'b' },
      ];
      mockLoading = true;

      const { getByTestId, queryByTestId } = render(<BenefitsPreview />);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SKELETON),
      ).toBeOnTheScreen();
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
      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.benefits.empty-list',
        undefined,
      );
    });

    it('does not request available_count copy when there are no benefits', () => {
      render(<BenefitsPreview />);

      const availableCountCalls = mockStrings.mock.calls.filter(
        (call) => call[0] === 'rewards.benefits.available_count',
      );

      expect(availableCountCalls).toHaveLength(0);
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

    it('lays the benefit cards out in a snapping horizontal carousel', () => {
      const { getByTestId } = render(<BenefitsPreview />);

      const carousel = getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS);

      expect(carousel.props.horizontal).toBe(true);
      // Two 210pt tiles plus gap and padding overflow a 390pt viewport by 74,
      // which is where the trailing tile settles flush against the edge.
      expect(carousel.props.snapToOffsets).toEqual([0, 74]);
    });

    it('lets the last of three tiles snap instead of springing back', () => {
      mockBenefits = [
        { id: 1, longTitle: 'B1', shortDescription: 'a' },
        { id: 2, longTitle: 'B2', shortDescription: 'b' },
        { id: 3, longTitle: 'B3', shortDescription: 'c' },
      ];

      const { getByTestId } = render(<BenefitsPreview />);

      const carousel = getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS);

      expect(carousel.props.snapToOffsets).toEqual([0, 222, 296]);
    });

    it('keeps snap offsets ascending when every tile already fits', () => {
      mockWindowWidth = 1024;

      const { getByTestId } = render(<BenefitsPreview />);

      const carousel = getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS);

      expect(carousel.props.snapToOffsets).toEqual([0, 0]);
    });

    it('clamps every snap offset when three tiles already fit', () => {
      mockBenefits = [
        { id: 1, longTitle: 'B1', shortDescription: 'a' },
        { id: 2, longTitle: 'B2', shortDescription: 'b' },
        { id: 3, longTitle: 'B3', shortDescription: 'c' },
      ];
      // Three 210pt tiles, two 12pt gaps and 32pt of padding are 686pt wide,
      // so an 844pt viewport has nowhere to scroll.
      mockWindowWidth = 844;

      const { getByTestId } = render(<BenefitsPreview />);

      const carousel = getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS);

      expect(carousel.props.snapToOffsets).toEqual([0, 0, 0]);
    });

    it('clamps the middle snap offset to the end of the content', () => {
      mockBenefits = [
        { id: 1, longTitle: 'B1', shortDescription: 'a' },
        { id: 2, longTitle: 'B2', shortDescription: 'b' },
        { id: 3, longTitle: 'B3', shortDescription: 'c' },
      ];
      // The middle pitch is 222, but a 500pt viewport can only scroll 186
      // before the row ends.
      mockWindowWidth = 500;

      const { getByTestId } = render(<BenefitsPreview />);

      const carousel = getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS);

      expect(carousel.props.snapToOffsets).toEqual([0, 186, 186]);
    });

    it('renders each carousel card as the preview variant', () => {
      const { getByTestId } = render(<BenefitsPreview />);

      expect(getByTestId('benefit-card-1').props.variant).toBe('preview');
      expect(getByTestId('benefit-card-2').props.variant).toBe('preview');
    });

    it('disables benefit cards while the carousel is dragged', () => {
      const { getByTestId } = render(<BenefitsPreview />);
      const carousel = getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS);

      expect(getByTestId('benefit-card-1').props.disabled).toBe(false);
      expect(getByTestId('benefit-card-2').props.disabled).toBe(false);

      fireEvent(carousel, 'scrollBeginDrag');

      expect(getByTestId('benefit-card-1').props.disabled).toBe(true);
      expect(getByTestId('benefit-card-2').props.disabled).toBe(true);

      fireEvent(carousel, 'scrollEndDrag');

      expect(getByTestId('benefit-card-1').props.disabled).toBe(false);
      expect(getByTestId('benefit-card-2').props.disabled).toBe(false);
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

    it('shows available benefits count in the header tag', () => {
      const { getByText } = render(<BenefitsPreview />);

      expect(getByText('2 available')).toBeOnTheScreen();
      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.benefits.available_count',
        {
          count: '2',
        },
      );
    });

    it('places the benefits count in the header end accessory', () => {
      const { UNSAFE_getByType } = render(<BenefitsPreview />);
      const header = UNSAFE_getByType(SectionHeader);

      const slots = render(
        <>
          <View testID="benefits-title-accessory">
            {header.props.titleAccessory}
          </View>
          <View testID="benefits-end-accessory">
            {header.props.endAccessory}
          </View>
        </>,
      );

      expect(
        within(slots.getByTestId('benefits-end-accessory')).getByText(
          '2 available',
        ),
      ).toBeOnTheScreen();
      expect(
        within(slots.getByTestId('benefits-title-accessory')).queryByText(
          '2 available',
        ),
      ).toBeNull();
      expect(header.props.titleAccessory.type).toBe(Icon);
      expect(header.props.titleAccessory.props.name).toBe(IconName.ArrowRight);
    });

    it('caps displayed benefits count at 99+ in the header tag', () => {
      mockBenefits = Array.from({ length: 100 }, (_, index) => ({
        id: index + 1,
        longTitle: `Benefit ${index + 1}`,
        shortDescription: 'd',
      }));

      const { getByText } = render(<BenefitsPreview />);

      expect(getByText('99+ available')).toBeOnTheScreen();
      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.benefits.available_count',
        {
          count: '99+',
        },
      );
    });

    it('displays numeric count 99 in the header tag when there are exactly 99 benefits', () => {
      mockBenefits = Array.from({ length: 99 }, (_, index) => ({
        id: index + 1,
        longTitle: `Benefit ${index + 1}`,
        shortDescription: 'd',
      }));

      const { getByText } = render(<BenefitsPreview />);

      expect(getByText('99 available')).toBeOnTheScreen();
      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.benefits.available_count',
        {
          count: '99',
        },
      );
    });

    it('renders a single benefit card when the list has one item', () => {
      mockBenefits = [
        { id: 42, longTitle: 'Solo benefit', shortDescription: 'only one' },
      ];

      const { getByTestId, getByText, queryByTestId } = render(
        <BenefitsPreview />,
      );

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS),
      ).toBeOnTheScreen();
      expect(getByText('Solo benefit')).toBeOnTheScreen();
      expect(queryByTestId('benefit-card-2')).toBeNull();
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
