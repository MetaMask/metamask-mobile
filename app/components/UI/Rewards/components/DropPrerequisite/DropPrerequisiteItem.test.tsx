import React from 'react';
import { render } from '@testing-library/react-native';
import DropPrerequisiteItem from './DropPrerequisiteItem';
import type {
  DropPrerequisiteDto,
  DropPrerequisiteStatusDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  Icon: 'Icon',
  TextVariant: { BodyMd: 'BodyMd', BodySm: 'BodySm' },
  FontWeight: { Medium: 'Medium' },
  IconSize: { Lg: 'Lg', Sm: 'Sm' },
  BoxFlexDirection: { Row: 'Row' },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

jest.mock('../../../../../component-library/base-components/TagBase', () => {
  const ActualReact = jest.requireActual('react');
  const TagBase = ({
    children,
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) => ActualReact.createElement('TagBase', { testID }, children);
  return {
    __esModule: true,
    default: TagBase,
    TagSeverity: { Neutral: 'Neutral' },
  };
});

jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  TextVariant: { BodySMMedium: 'BodySMMedium' },
}));

jest.mock('../../../../../component-library/components/Skeleton', () => ({
  Skeleton: 'Skeleton',
}));

jest.mock('../../utils/formatUtils', () => ({
  getIconName: jest.fn(() => 'Swap'),
}));

const createMockPrerequisite = (
  overrides: Partial<DropPrerequisiteDto> = {},
): DropPrerequisiteDto => ({
  type: 'ACTIVITY_COUNT',
  activityTypes: ['SWAP'],
  minCount: 5,
  title: 'Complete 5 swaps',
  description: 'Swap tokens at least 5 times',
  iconName: 'swap',
  ...overrides,
});

const createMockStatus = (
  overrides: Partial<DropPrerequisiteStatusDto> = {},
): DropPrerequisiteStatusDto => ({
  satisfied: false,
  current: 2,
  required: 5,
  prerequisite: createMockPrerequisite(),
  ...overrides,
});

describe('DropPrerequisiteItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton when loading', () => {
    const { getByTestId } = render(
      <DropPrerequisiteItem prerequisite={createMockPrerequisite()} loading />,
    );

    expect(getByTestId('drop-prerequisite-item-skeleton')).toBeOnTheScreen();
  });

  it('renders prerequisite content when not loading', () => {
    const { getByTestId } = render(
      <DropPrerequisiteItem
        prerequisite={createMockPrerequisite()}
        status={createMockStatus()}
      />,
    );

    expect(getByTestId('drop-prerequisite-item')).toBeOnTheScreen();
    expect(getByTestId('drop-prerequisite-item-icon')).toBeOnTheScreen();
    expect(getByTestId('drop-prerequisite-item-title')).toBeOnTheScreen();
  });

  it('renders progress badge when status is provided', () => {
    const { getByTestId } = render(
      <DropPrerequisiteItem
        prerequisite={createMockPrerequisite()}
        status={createMockStatus({ current: 3, required: 5 })}
      />,
    );

    expect(
      getByTestId('drop-prerequisite-item-progress-badge'),
    ).toBeOnTheScreen();
  });

  it('hides progress badge when hideStatus is true', () => {
    const { queryByTestId } = render(
      <DropPrerequisiteItem
        prerequisite={createMockPrerequisite()}
        status={createMockStatus()}
        hideStatus
      />,
    );

    expect(queryByTestId('drop-prerequisite-item-progress-badge')).toBeNull();
  });

  it('renders with default status values when no status provided', () => {
    const { getByTestId } = render(
      <DropPrerequisiteItem
        prerequisite={createMockPrerequisite({ minCount: 10 })}
      />,
    );

    expect(getByTestId('drop-prerequisite-item')).toBeOnTheScreen();
  });
});
