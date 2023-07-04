import React from 'react';
import { shallow } from 'enzyme';
import ImportPrivateKey from './';
import { NavigationContainer } from '@react-navigation/native';

describe('ImportPrivateKey', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <NavigationContainer>
        <ImportPrivateKey route={{ params: {} }} />
      </NavigationContainer>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
