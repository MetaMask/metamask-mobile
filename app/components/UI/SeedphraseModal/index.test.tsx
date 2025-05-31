import React from 'react';
import { render } from '@testing-library/react-native';
import SeedphraseModal from './';
import { SafeAreaProvider } from 'react-native-safe-area-context';

describe('SeedphraseModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <SafeAreaProvider>
        <SeedphraseModal />
      </SafeAreaProvider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
