import React from 'react';
import { shallow } from 'enzyme';
import BiometryButton from './BiometryButton';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';

describe('BiometryButton', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <BiometryButton
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onPress={() => {}}
        hidden={false}
        biometryType={AUTHENTICATION_TYPE.BIOMETRIC}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
