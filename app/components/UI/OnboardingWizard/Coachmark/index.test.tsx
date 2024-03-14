import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Coachmark from './';
jest.useFakeTimers();

describe('Coachmark', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Coachmark
        content={'content'}
        title={'title'}
        currentStep={1}
        topIndicatorPosition={'topLeft'}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
