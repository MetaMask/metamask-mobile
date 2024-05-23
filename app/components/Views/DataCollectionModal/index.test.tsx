import React from 'react';
import { shallow } from 'enzyme';
import DataCollectionModal from './';
import { NavigationContainer } from '@react-navigation/native';

describe('DataCollectionModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <NavigationContainer>
        <DataCollectionModal />
      </NavigationContainer>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
