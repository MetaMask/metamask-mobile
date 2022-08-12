import React from 'react';
import { Text } from 'react-native';
import { shallow } from 'enzyme';
import BlockingActionModal from './';

describe('BlockingActionModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <BlockingActionModal isLoadingAction modalVisible>
        <Text>{'Please wait'}</Text>
      </BlockingActionModal>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
