import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import GasEducationCarousel from '.';

jest.mock('../../../core/Engine', () => ({
  context: {
    GasFeeController: jest.fn(),
  },
}));

describe('GasEducationCarousel', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <GasEducationCarousel
        navigation={{ getParam: () => false, setOptions: () => null }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
