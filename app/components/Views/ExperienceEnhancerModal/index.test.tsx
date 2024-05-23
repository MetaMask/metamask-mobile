import React from 'react';
import ExperienceEnhancerModal from './';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render } from '@testing-library/react-native';

describe('ExperienceEnhancerModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <SafeAreaProvider>
        <ExperienceEnhancerModal />
      </SafeAreaProvider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
