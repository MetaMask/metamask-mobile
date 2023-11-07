import React from 'react';
import { shallow } from 'enzyme';
import Coachmark from './';
jest.useFakeTimers();

describe('Coachmark', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Coachmark
        content={'content'}
        title={'title'}
        currentStep={1}
        topIndicatorPosition={'topLeft'}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
