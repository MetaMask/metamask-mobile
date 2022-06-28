import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';
import MultiselectListItem from './MultiselectListItem';

describe('MultiselectListItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <MultiselectListItem isSelected>
        <View />
      </MultiselectListItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
