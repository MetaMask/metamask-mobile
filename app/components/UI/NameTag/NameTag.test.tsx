import React from 'react';
import { default as NameTag } from './NameTag';
import { render } from '@testing-library/react-native';

describe('NameTag', () => {
  describe('unknown address', () => {
    const UNKNOWN_ADDRESS = '0x2990079bcdEe240329a520d2444386FC119da21a';

    it('should render snapshot correctly', () => {
      const wrapper = render(<NameTag address={UNKNOWN_ADDRESS} />);
      expect(wrapper).toMatchSnapshot();
    });
  });
});
