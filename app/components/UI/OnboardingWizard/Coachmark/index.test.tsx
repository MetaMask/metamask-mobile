import React from 'react';
import { render } from '@testing-library/react-native';
import Coachmark from './';

describe('Coachmark', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
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
