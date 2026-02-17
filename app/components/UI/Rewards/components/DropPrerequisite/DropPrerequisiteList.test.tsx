import React from 'react';
import { render } from '@testing-library/react-native';
import DropPrerequisiteList from './DropPrerequisiteList';
import {
  DropPrerequisitesDto,
  DropPrerequisiteDto,
  DropPrerequisiteStatusDto,
  PointsEventEarnType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  TextVariant: { BodySm: 'BodySm' },
  FontWeight: { Medium: 'Medium' },
}));

jest.mock('../../../../../component-library/components/Skeleton', () => ({
  Skeleton: 'Skeleton',
}));

jest.mock('./DropPrerequisiteItem', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const createMockCondition = (activityType: string): DropPrerequisiteDto => ({
  type: 'ACTIVITY_COUNT',
  activityTypes: [activityType as PointsEventEarnType],
  minCount: 1,
  title: `${activityType} Condition`,
  description: 'Test Description',
  iconName: 'swap',
});

const createMockPrerequisites = (
  logic: 'AND' | 'OR' = 'OR',
  conditions: DropPrerequisiteDto[] = [],
): DropPrerequisitesDto => ({
  logic,
  conditions,
});

const createMockStatus = (
  prerequisite: DropPrerequisiteDto,
): DropPrerequisiteStatusDto => ({
  prerequisite,
  satisfied: false,
  current: 0,
  required: 1,
});

describe('DropPrerequisiteList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton when isLoading is true', () => {
    const prerequisites = createMockPrerequisites('OR', [
      createMockCondition('swap'),
    ]);

    const { getByTestId } = render(
      <DropPrerequisiteList prerequisites={prerequisites} isLoading />,
    );

    expect(getByTestId('drop-prerequisite-list-skeleton')).toBeOnTheScreen();
  });

  it('renders prerequisites from conditions when no statuses provided', () => {
    const conditions = [
      createMockCondition('swap'),
      createMockCondition('perps'),
    ];
    const prerequisites = createMockPrerequisites('AND', conditions);

    const { getByTestId } = render(
      <DropPrerequisiteList prerequisites={prerequisites} />,
    );

    expect(getByTestId('drop-prerequisite-list')).toBeOnTheScreen();
  });

  it('renders prerequisites from statuses when provided', () => {
    const conditions = [createMockCondition('swap')];
    const prerequisites = createMockPrerequisites('OR', conditions);
    const statuses = conditions.map(createMockStatus);

    const { getByTestId } = render(
      <DropPrerequisiteList
        prerequisites={prerequisites}
        prerequisiteStatuses={statuses}
      />,
    );

    expect(getByTestId('drop-prerequisite-list')).toBeOnTheScreen();
  });

  it('renders logic separators between items', () => {
    const conditions = [
      createMockCondition('swap'),
      createMockCondition('perps'),
    ];
    const prerequisites = createMockPrerequisites('AND', conditions);

    const { getAllByTestId } = render(
      <DropPrerequisiteList prerequisites={prerequisites} />,
    );

    const separators = getAllByTestId('logic-separator');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('renders custom skeleton count', () => {
    const prerequisites = createMockPrerequisites('OR', []);

    render(
      <DropPrerequisiteList
        prerequisites={prerequisites}
        isLoading
        skeletonCount={3}
      />,
    );

    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const DropPrerequisiteItem = require('./DropPrerequisiteItem').default;
    expect(DropPrerequisiteItem).toHaveBeenCalledTimes(3);
  });
});
