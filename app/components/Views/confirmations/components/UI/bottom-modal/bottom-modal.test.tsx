import React from 'react';
import { Text, View } from 'react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import BottomModal from '.';

describe('BottomModal', () => {
  it('should match snapshot', async () => {
    const container = renderWithProvider(
      <BottomModal>
        <View>
          <Text>DUMMY</Text>
        </View>
      </BottomModal>,
      { state: {} },
    );
    expect(container).toMatchSnapshot();
  });
});
