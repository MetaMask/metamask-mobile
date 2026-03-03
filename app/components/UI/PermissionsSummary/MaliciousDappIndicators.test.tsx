import React from 'react';
import { render } from '@testing-library/react-native';
import {
  MaliciousDappUrlIcon,
  DangerConnectButtonContent,
  TrustSignalUrlIcon,
  getConnectButtonContent,
} from './MaliciousDappIndicators';
import { TrustSignalDisplayState } from '../../Views/confirmations/types/trustSignals';

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { inverse: '#FFFFFF' },
    },
  }),
}));

describe('MaliciousDappIndicators', () => {
  describe('MaliciousDappUrlIcon', () => {
    it('renders a Danger icon', () => {
      const { toJSON } = render(<MaliciousDappUrlIcon />);
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('Danger');
    });
  });

  describe('DangerConnectButtonContent', () => {
    it('renders the Connect label', () => {
      const { getByText } = render(<DangerConnectButtonContent />);
      expect(getByText('Connect')).toBeDefined();
    });

    it('renders a Danger icon alongside the label', () => {
      const { toJSON } = render(<DangerConnectButtonContent />);
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('Danger');
      expect(tree).toContain('Connect');
    });

    it('renders with a row layout', () => {
      const { toJSON } = render(<DangerConnectButtonContent />);
      const root = toJSON();
      const node = Array.isArray(root) ? root[0] : root;
      expect(node?.props?.style?.flexDirection).toBe('row');
    });
  });

  describe('TrustSignalUrlIcon', () => {
    it('renders a VerifiedFilled icon for Verified state', () => {
      const { toJSON } = render(
        <TrustSignalUrlIcon state={TrustSignalDisplayState.Verified} />,
      );
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('VerifiedFilled');
    });

    it('renders a Danger icon for Malicious state', () => {
      const { toJSON } = render(
        <TrustSignalUrlIcon state={TrustSignalDisplayState.Malicious} />,
      );
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('Danger');
    });

    it('renders nothing for Warning state', () => {
      const { toJSON } = render(
        <TrustSignalUrlIcon state={TrustSignalDisplayState.Warning} />,
      );
      expect(toJSON()).toBeNull();
    });

    it('renders nothing for Unknown state', () => {
      const { toJSON } = render(
        <TrustSignalUrlIcon state={TrustSignalDisplayState.Unknown} />,
      );
      expect(toJSON()).toBeNull();
    });

    it('renders nothing for Loading state', () => {
      const { toJSON } = render(
        <TrustSignalUrlIcon state={TrustSignalDisplayState.Loading} />,
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('getConnectButtonContent', () => {
    it('returns DangerConnectButtonContent when isMaliciousDapp is true', () => {
      const result = getConnectButtonContent(true, false);
      expect(React.isValidElement(result)).toBe(true);
    });

    it('returns DangerConnectButtonContent when trustSignalState is Malicious', () => {
      const result = getConnectButtonContent(
        false,
        false,
        TrustSignalDisplayState.Malicious,
      );
      expect(React.isValidElement(result)).toBe(true);
    });

    it('returns plain "Connect" string when trustSignalState is Warning', () => {
      const result = getConnectButtonContent(
        false,
        false,
        TrustSignalDisplayState.Warning,
      );
      expect(typeof result).toBe('string');
      expect(result).toBe('Connect');
    });

    it('returns plain "Connect" string when trustSignalState is Unknown', () => {
      const result = getConnectButtonContent(
        false,
        false,
        TrustSignalDisplayState.Unknown,
      );
      expect(typeof result).toBe('string');
      expect(result).toBe('Connect');
    });

    it('returns plain "Connect" string when trustSignalState is Verified', () => {
      const result = getConnectButtonContent(
        false,
        false,
        TrustSignalDisplayState.Verified,
      );
      expect(typeof result).toBe('string');
      expect(result).toBe('Connect');
    });

    it('returns confirm string for network switch regardless of trust signal', () => {
      const result = getConnectButtonContent(
        false,
        true,
        TrustSignalDisplayState.Malicious,
      );
      expect(typeof result).toBe('string');
      expect(result).toBe('Confirm');
    });
  });
});
