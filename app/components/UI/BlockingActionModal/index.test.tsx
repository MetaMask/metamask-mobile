import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import BlockingActionModal from './';

describe('BlockingActionModal', () => {
  it('should render correctly', () => {
    render(
      <BlockingActionModal isLoadingAction modalVisible>
        <Text>{'Please wait'}</Text>
      </BlockingActionModal>,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
