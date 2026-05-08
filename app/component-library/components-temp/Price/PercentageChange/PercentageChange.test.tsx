import React from 'react';
import { render } from '@testing-library/react-native';
import PercentageChange from './PercentageChange';
import { mockTheme } from '../../../../util/theme';

describe('PercentageChange', () => {
  it('displays positive value with success color', () => {
    const { getByText } = render(<PercentageChange value={5.5} />);

    const positiveText = getByText('+5.50%');

    expect(positiveText).toBeOnTheScreen();
    expect(positiveText.props.style).toMatchObject({
      color: mockTheme.colors.success.default,
    });
  });

  it('displays negative value with error color', () => {
    const { getByText } = render(<PercentageChange value={-3.25} />);

    const negativeText = getByText('-3.25%');

    expect(negativeText).toBeOnTheScreen();
    expect(negativeText.props.style).toMatchObject({
      color: mockTheme.colors.error.default,
    });
  });

  it('renders nothing when value is null', () => {
    const { queryByText } = render(<PercentageChange value={null} />);

    expect(queryByText(/\+/)).toBeNull();
    expect(queryByText(/-/)).toBeNull();
  });

  it('renders nothing when value is undefined', () => {
    const { queryByText } = render(<PercentageChange value={undefined} />);

    expect(queryByText(/\+/)).toBeNull();
    expect(queryByText(/-/)).toBeNull();
  });
});
