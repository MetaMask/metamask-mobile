import React from 'react';
import { render } from '@testing-library/react-native';
import BiometryButton from './BiometryButton';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';

describe('BiometryButton', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <BiometryButton
        // eslint-disable-next-line no-empty-function
        onPress={() => {}}
        hidden={false}
        biometryType={AUTHENTICATION_TYPE.BIOMETRIC}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
