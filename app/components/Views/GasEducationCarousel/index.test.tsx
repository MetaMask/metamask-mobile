import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import GasEducationCarousel from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
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
