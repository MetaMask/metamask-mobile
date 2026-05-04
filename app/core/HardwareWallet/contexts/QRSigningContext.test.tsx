import React from 'react';
import { render } from '@testing-library/react-native';

import { useQRSigning } from './QRSigningContext';

describe('QRSigningContext', () => {
  describe('useQRSigning', () => {
    it('throws when used outside HardwareWalletProvider', () => {
      const TestConsumer: React.FC = () => {
        useQRSigning();
        return null;
      };

      expect(() => render(<TestConsumer />)).toThrow(
        'useQRSigning must be used within a HardwareWalletProvider',
      );
    });
  });
});
