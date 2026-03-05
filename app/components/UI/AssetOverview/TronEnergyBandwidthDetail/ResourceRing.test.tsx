import React from 'react';
import { render } from '@testing-library/react-native';
import ResourceRing from './ResourceRing';
import { IconName } from '@metamask/design-system-react-native';
import { mockTheme } from '../../../../util/theme';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const base = jest.fn(() => ({}));
    return Object.assign(base, { style: base });
  },
}));

jest.mock('../../../../util/theme', () => {
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
});
