import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import BenefitCard from './BenefitCard';
import Routes from '../../../../../constants/navigation/Routes';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { formatDateRemaining } from '../../utils/formatUtils';
import type { SubscriptionBenefitDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';

const mockNavigate = jest.fn();
const mockFormatDateRemaining = formatDateRemaining as jest.MockedFunction<
  typeof formatDateRemaining
>;
const mockStrings = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'rewards.benefits.test_title': 'Premium Benefit',
    'rewards.benefits.test_short_description': 'Short benefit description',
    'rewards.benefits.test_navigate_title': 'Navigate Benefit',
  };
  return translations[key] || key;
});

jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: (...args: unknown[]) => mockNavigate(...args),
    },
  },
}));

jest.mock('../../utils/formatUtils', () => ({
  ...jest.requireActual('../../utils/formatUtils'),
  formatDateRemaining: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => mockStrings(key),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

const createBenefit = (
  overrides: Partial<SubscriptionBenefitDto> = {},
): SubscriptionBenefitDto => ({
  id: 1,
  longTitle: strings('rewards.benefits.test_title'),
  shortDescription: strings('rewards.benefits.test_short_description'),
  longDescription: 'Long benefit description',
  thumbnail: 'https://example.com/image.png',
  validFrom: '2026-01-01T00:00:00Z',
  validTo: '2026-12-31T23:59:59Z',
  url: 'https://example.com/claim',
  actionDate: '2026-08-01T00:00:00Z',
  chain: 'ethereum',
  type: { id: 9, name: 'Partner' },
  ...overrides,
});

describe('BenefitCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatDateRemaining.mockReturnValue('1m 3d');
  });

  describe('rendering', () => {
    it('renders title and description text', () => {
      const benefit = createBenefit();
      const { getByText } = render(<BenefitCard benefit={benefit} />);

      expect(
        getByText(strings('rewards.benefits.test_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('rewards.benefits.test_short_description')),
      ).toBeOnTheScreen();
    });

    it('applies text truncation limits for title and description', () => {
      const benefit = createBenefit();
      const { getByText } = render(<BenefitCard benefit={benefit} />);

      expect(
        getByText(strings('rewards.benefits.test_title')).props.numberOfLines,
      ).toBe(1);
      expect(
        getByText(strings('rewards.benefits.test_short_description')).props
          .numberOfLines,
      ).toBe(3);
    });

    it('renders benefit image with expected source and format sizing', () => {
      const benefit = createBenefit({
        thumbnail: 'https://cdn.example.com/benefit.png',
      });
      const { getByTestId } = render(<BenefitCard benefit={benefit} />);

      const image = getByTestId(
        REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS_IMAGE,
      );

      expect(image).toBeOnTheScreen();
      expect(image.props.source).toEqual({
        uri: 'https://cdn.example.com/benefit.png',
      });
      expect(image.props.resizeMode).toBe('cover');
      expect(image.props.style).toContain('w-full h-full rounded-lg');
    });
  });

  describe('remaining time', () => {
    it('formats and renders remaining time when actionDate exists', () => {
      const benefit = createBenefit({ actionDate: '2026-09-01T00:00:00Z' });
      const { getByText } = render(<BenefitCard benefit={benefit} />);

      expect(mockFormatDateRemaining).toHaveBeenCalledTimes(1);
      expect(mockFormatDateRemaining).toHaveBeenCalledWith(
        '2026-09-01T00:00:00Z',
        undefined,
      );
      expect(getByText('1m 3d')).toBeOnTheScreen();
    });

    it('does not call formatter and hides remaining time when actionDate is null', () => {
      const benefit = createBenefit({
        actionDate: null,
      });
      const { queryByText } = render(<BenefitCard benefit={benefit} />);

      expect(mockFormatDateRemaining).not.toHaveBeenCalled();
      expect(queryByText('1m 3d')).toBeNull();
    });

    it('hides remaining time when formatter returns null', () => {
      mockFormatDateRemaining.mockReturnValue(null);
      const benefit = createBenefit();
      const { queryByText } = render(<BenefitCard benefit={benefit} />);

      expect(queryByText('1m 3d')).toBeNull();
    });
  });

  describe('interaction', () => {
    it('navigates to BenefitFullView with benefit payload on press', () => {
      const benefit = createBenefit({
        id: 77,
        longTitle: strings('rewards.benefits.test_navigate_title'),
      });
      const { getByText } = render(<BenefitCard benefit={benefit} />);

      fireEvent.press(
        getByText(strings('rewards.benefits.test_navigate_title')),
      );

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARD_BENEFIT_FULL_VIEW,
        {
          benefit,
        },
      );
    });

    it('uses expected touchable activeOpacity', () => {
      const benefit = createBenefit();
      const { UNSAFE_getByType } = render(<BenefitCard benefit={benefit} />);

      const touchable = UNSAFE_getByType(TouchableOpacity);
      expect(touchable.props.activeOpacity).toBe(0.7);
    });

    it('keeps navigation payload shape stable', () => {
      const benefit = createBenefit({ id: 999, type: { id: 42, name: 'VIP' } });
      const { getByText } = render(<BenefitCard benefit={benefit} />);

      fireEvent.press(getByText(strings('rewards.benefits.test_title')));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARD_BENEFIT_FULL_VIEW,
        expect.objectContaining({
          benefit: expect.objectContaining({
            id: 999,
            type: { id: 42, name: 'VIP' },
          }),
        }),
      );
    });
  });
});
