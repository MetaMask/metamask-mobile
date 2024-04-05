import React from 'react';
import { shallow } from 'enzyme';
import EnterPasswordSimple from './';
import { NavigationContainer } from '@react-navigation/native';

describe('EnterPasswordSimple', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <NavigationContainer>
        <EnterPasswordSimple route={{ params: {} }} />
      </NavigationContainer>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
