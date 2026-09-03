import React from 'react';
import { render } from '@testing-library/react-native';
import {
  MaliciousDappUrlIcon,
  getConnectButtonContent,
} from './MaliciousDappIndicators';

describe('MaliciousDappIndicators', () => {
  describe('MaliciousDappUrlIcon', () => {
    it('renders a Danger icon', () => {
      const { toJSON } = render(<MaliciousDappUrlIcon />);
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('Danger');
    });
  });

  describe('getConnectButtonContent', () => {
    it('returns the Connect label for a standard connection', () => {
      expect(getConnectButtonContent(false, false)).toBe('Connect');
    });

    it('returns the Confirm label for a network switch', () => {
      expect(getConnectButtonContent(false, true)).toBe('Confirm');
    });

    it('returns the Connect label for a malicious dapp connection', () => {
      expect(getConnectButtonContent(true, false)).toBe('Connect');
    });
  });
});
