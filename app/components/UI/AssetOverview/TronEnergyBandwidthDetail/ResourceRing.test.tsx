import React from 'react';
import { render } from '@testing-library/react-native';
import { withTiming } from 'react-native-reanimated';
import ResourceRing from './ResourceRing';
import { IconName } from '@metamask/design-system-react-native';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  withTiming: jest.fn((value: number) => value),
}));

const mockWithTiming = jest.mocked(withTiming);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const base = jest.fn(() => ({}));
    return Object.assign(base, { style: base });
  },
}));

jest.mock('../../../../util/theme', () => {
  // Use the real mockTheme to avoid circular mock issues
  const actual = jest.requireActual('../../../../util/theme');
  return {
    ...actual,
    useTheme: () => actual.mockTheme,
  };
});

describe('ResourceRing', () => {
  it('renders the ring icon', () => {
    const { getByTestId } = render(<ResourceRing icon={IconName.Flash} />);

    const icon = getByTestId('resource-ring-icon');
    expect(icon.props.name).toBe(IconName.Flash);
  });

  it('does not render the arc when indeterminate=true', () => {
    const { queryByTestId } = render(
      <ResourceRing icon={IconName.Connect} indeterminate />,
    );

    expect(queryByTestId('resource-ring-fill')).toBeNull();
  });

  it('renders the background circle element of the ring', () => {
    const { getByTestId } = render(<ResourceRing icon={IconName.Flash} />);

    expect(getByTestId('resource-ring-background')).toBeTruthy();
  });

  describe('progress animation', () => {
    beforeEach(() => {
      mockWithTiming.mockClear();
    });

    it('animates the given progress over 800ms', () => {
      render(<ResourceRing icon={IconName.Flash} progress={0.4} />);

      expect(mockWithTiming).toHaveBeenCalledTimes(1);
      expect(mockWithTiming).toHaveBeenCalledWith(0.4, { duration: 800 });
    });

    it('clamps progress into the 0 to 1 range', () => {
      const { rerender } = render(
        <ResourceRing icon={IconName.Flash} progress={1.4} />,
      );

      expect(mockWithTiming).toHaveBeenCalledWith(1, { duration: 800 });

      mockWithTiming.mockClear();
      rerender(<ResourceRing icon={IconName.Connect} progress={-0.2} />);

      expect(mockWithTiming).toHaveBeenCalledTimes(1);
      expect(mockWithTiming).toHaveBeenCalledWith(0, { duration: 800 });
    });
  });
});
