import React from 'react';

import { Pill } from './pill';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
    },
  }),
}));

describe('Pill', () => {
  it('renders correctly with text prop', () => {
    const testText = 'Test Pill Text';
    const { getByText } = renderWithProvider(<Pill text={testText} />);

    expect(getByText(testText)).toBeTruthy();
  });

  it('renders with empty string', () => {
    const { getByText } = renderWithProvider(<Pill text="" />);

    expect(getByText('')).toBeTruthy();
  });
});
