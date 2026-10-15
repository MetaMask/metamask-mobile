import React from 'react';
import { render } from '@testing-library/react-native';
import MoneySecuritySetupTitle from './MoneySecuritySetupTitle';

describe('MoneySecuritySetupTitle', () => {
  it('uses the shared setup-title typography', () => {
    const { getByText } = render(
      <MoneySecuritySetupTitle>Setup title</MoneySecuritySetupTitle>,
    );

    expect(getByText('Setup title')).toBeOnTheScreen();
  });
});
