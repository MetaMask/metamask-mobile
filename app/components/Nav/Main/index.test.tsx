import React from 'react';
import { shallow } from 'enzyme';
// eslint-disable-next-line import/named
import { NavigationContainer } from '@react-navigation/native';
import Main from './';

describe('Main', () => {
  it('should render correctly', () => {
    const MainAppContainer = () => (
      <NavigationContainer>
        <Main />
      </NavigationContainer>
    );
    const wrapper = shallow(<MainAppContainer />);
    expect(wrapper).toMatchSnapshot();
  });
});
