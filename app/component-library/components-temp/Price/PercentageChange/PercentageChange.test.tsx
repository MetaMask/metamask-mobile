import React from 'react';
import { render } from '@testing-library/react-native';
import PercentageChange from './PercentageChange';
import { mockTheme } from '../../../../util/theme';

describe('PercentageChange', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<PercentageChange value={5.5} />);
    expect(toJSON()).toMatchSnapshot();
  });
  it('displays a positive value correctly', () => {
    const { getByText } = render(<PercentageChange value={5.5} />);
    const positiveText = getByText('+5.50%');
    expect(positiveText).toBeTruthy();
    expect(positiveText.props.style).toMatchObject({
      color: mockTheme.colors.success.default,
      textTransform: 'uppercase',
    });
  });

  it('displays a negative value correctly', () => {
    const { getByText } = render(<PercentageChange value={-3.25} />);
    const negativeText = getByText('-3.25%');
    expect(negativeText).toBeTruthy();
    expect(negativeText.props.style).toMatchObject({
      color: mockTheme.colors.error.default,
      textTransform: 'uppercase',
    });
  });

  it('handles null value correctly', () => {
    const { queryByText } = render(<PercentageChange value={null} />);
    expect(queryByText(/\+/)).toBeNull();
    expect(queryByText(/-/)).toBeNull();
  });

  it('handles undefined value correctly', () => {
    const { queryByText } = render(<PercentageChange value={undefined} />);
    expect(queryByText(/\+/)).toBeNull();
    expect(queryByText(/-/)).toBeNull();
  });
});
