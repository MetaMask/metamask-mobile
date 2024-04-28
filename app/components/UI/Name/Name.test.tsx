import React from 'react';
import { default as Name } from './Name';
import { render } from '@testing-library/react-native';

const UNKNOWN_ADDRESS_CHECKSUMMED =
  '0x299007B3F9E23B8d432D5f545F8a4a2B3E9A5B4e';

const UNKNOWN_ADDRESS_NOT_CHECKSUMMED =
  UNKNOWN_ADDRESS_CHECKSUMMED.toLowerCase();

describe('Name', () => {
  describe('unknown address', () => {
    it('displays checksummed address', () => {
      const wrapper = render(
        <Name address={UNKNOWN_ADDRESS_NOT_CHECKSUMMED} />,
      );
      expect(wrapper.getByText(UNKNOWN_ADDRESS_CHECKSUMMED)).toBeTruthy();
    });

    it('should render snapshot correctly', () => {
      const wrapper = render(
        <Name address={UNKNOWN_ADDRESS_NOT_CHECKSUMMED} />,
      );
      expect(wrapper).toMatchSnapshot();
    });
  });
});
