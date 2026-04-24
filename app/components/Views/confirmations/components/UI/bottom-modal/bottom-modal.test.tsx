import React from 'react';
import { Text, View } from 'react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import BottomModal from '.';

describe('BottomModal', () => {
  it('renders children', () => {
    const { getByText } = renderWithProvider(
      <BottomModal>
        <View>
          <Text>DUMMY</Text>
        </View>
      </BottomModal>,
      { state: {} },
    );
    expect(getByText('DUMMY')).toBeOnTheScreen();
  });
});
