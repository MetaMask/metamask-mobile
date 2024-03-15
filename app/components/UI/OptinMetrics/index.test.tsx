import React from 'react';
import OptinMetrics from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('OptinMetrics', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <OptinMetrics navigation={{ setOptions: () => null }} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
