import React from 'react';
import { render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import DropCTAButtons from './DropCTAButtons';
import { useSwapBridgeNavigation } from '../../../Bridge/hooks/useSwapBridgeNavigation';
import {
  DropPrerequisitesDto,
  DropPrerequisiteDto,
  PointsEventEarnType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Button: 'Button',
  ButtonVariant: { Primary: 'Primary' },
  ButtonSize: { Lg: 'Lg' },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: jest.fn(),
  SwapBridgeNavigationLocation: { Rewards: 'Rewards' },
}));

jest.mock('./DropCTAButtons.handlers', () => ({
  CTA_CONFIG: {
    swap: { label: 'Swap', handler: jest.fn() },
    perps: { label: 'Perps', handler: jest.fn() },
  },
  getConditionsWithActivityTypes: jest.fn((conditions) =>
    conditions
      .filter((c: DropPrerequisiteDto) =>
        ['swap', 'perps'].includes(c.activityTypes[0]),
      )
      .map((c: DropPrerequisiteDto) => ({
        condition: c,
        activityType: c.activityTypes[0],
      })),
  ),
}));

const createMockPrerequisites = (
  conditions: DropPrerequisiteDto[] = [],
): DropPrerequisitesDto => ({
  logic: 'OR',
  conditions,
});

const createMockCondition = (activityType: string): DropPrerequisiteDto => ({
  type: 'ACTIVITY_COUNT',
  activityTypes: [activityType as PointsEventEarnType],
  minCount: 1,
  title: 'Test Condition',
  description: 'Test Description',
  iconName: 'swap',
});

describe('DropCTAButtons', () => {
  const mockNavigation = { navigate: jest.fn() };
  const mockGoToSwaps = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useSelector as jest.Mock).mockReturnValue(false);
    (useSwapBridgeNavigation as jest.Mock).mockReturnValue({
      goToSwaps: mockGoToSwaps,
    });
  });

  it('returns null when no CTA-eligible conditions exist', () => {
    const prerequisites = createMockPrerequisites([]);

    const { toJSON } = render(<DropCTAButtons prerequisites={prerequisites} />);

    expect(toJSON()).toBeNull();
  });

  it('renders CTA buttons for eligible activity types', () => {
    const prerequisites = createMockPrerequisites([
      createMockCondition('swap'),
      createMockCondition('perps'),
    ]);

    const { getByTestId } = render(
      <DropCTAButtons prerequisites={prerequisites} />,
    );

    expect(getByTestId('drop-cta-buttons')).toBeOnTheScreen();
    expect(getByTestId('drop-cta-button-swap')).toBeOnTheScreen();
    expect(getByTestId('drop-cta-button-perps')).toBeOnTheScreen();
  });

  it('does not render buttons for ineligible activity types', () => {
    const prerequisites = createMockPrerequisites([
      createMockCondition('unknown'),
    ]);

    const { toJSON } = render(<DropCTAButtons prerequisites={prerequisites} />);

    expect(toJSON()).toBeNull();
  });
});
