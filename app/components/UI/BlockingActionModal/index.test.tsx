import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import BlockingActionModal from './';

describe('BlockingActionModal', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <BlockingActionModal isLoadingAction modalVisible>
        <Text>{'Please wait'}</Text>
      </BlockingActionModal>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
