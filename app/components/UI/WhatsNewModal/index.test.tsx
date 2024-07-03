import React from 'react';
import { render } from '@testing-library/react-native';
import WhatsNewModal from './';
import { NavigationContainer } from '@react-navigation/native';

describe('WhatsNewModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <WhatsNewModal />
      </NavigationContainer>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
