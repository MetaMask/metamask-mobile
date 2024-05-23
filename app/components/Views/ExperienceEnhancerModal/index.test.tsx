import React from 'react';
import { shallow } from 'enzyme';
import ExperienceEnhancerModal from './';
import { NavigationContainer } from '@react-navigation/native';

describe('ExperienceEnhancerModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <NavigationContainer>
        <ExperienceEnhancerModal />
      </NavigationContainer>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
