import React from 'react';
import { render } from '@testing-library/react-native';
import AmbiguousAddressSheet from './AmbiguousAddressSheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';

describe('AmbiguousAddressSheet', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <SafeAreaProvider>
        <AmbiguousAddressSheet />
      </SafeAreaProvider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
