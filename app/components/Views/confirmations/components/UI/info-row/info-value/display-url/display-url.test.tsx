import React from 'react';
import { render } from '@testing-library/react-native';

import DisplayURL from './display-url';
import { useOriginTrustSignals } from '../../../../../hooks/useOriginTrustSignals';
import { TrustSignalDisplayState } from '../../../../../types/trustSignals';
import AppConstants from '../../../../../../../../core/AppConstants';

jest.mock('../../../../../hooks/useOriginTrustSignals');

const mockUseOriginTrustSignals = useOriginTrustSignals as jest.MockedFunction<
  typeof useOriginTrustSignals
>;

describe('DisplayURL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOriginTrustSignals.mockReturnValue({
      state: TrustSignalDisplayState.Unknown,
      label: null,
    });
  });

  describe('basic URL display', () => {
    it('displays url without protocol', () => {
      const { getByText } = render(<DisplayURL url="https://google.com" />);
      expect(getByText('google.com')).toBeTruthy();
    });

    it('displays only the host part of the URL', () => {
      const { getByText } = render(
        <DisplayURL url="https://metamask.github.io/test-dapp/" />,
      );
      expect(getByText('metamask.github.io')).toBeTruthy();
    });
  });

  describe('HTTP warning', () => {
    it('displays HTTP warning badge for HTTP URLs when trust state is unknown', () => {
      const { getByText } = render(<DisplayURL url="http://google.com" />);
      expect(getByText('HTTP')).toBeTruthy();
    });

    it('prioritizes malicious state over HTTP warning', () => {
      mockUseOriginTrustSignals.mockReturnValue({
        state: TrustSignalDisplayState.Malicious,
        label: null,
      });

      const { queryByText, getByTestId } = render(
        <DisplayURL url="http://malicious-site.com" />,
      );

      // Should show malicious icon, not HTTP warning
      expect(getByTestId('trust-signal-icon-malicious')).toBeTruthy();
      expect(queryByText('HTTP')).toBeNull();
    });
  });

  describe('trust signal icons', () => {
    it('renders danger icon with error color when trust state is malicious', () => {
      mockUseOriginTrustSignals.mockReturnValue({
        state: TrustSignalDisplayState.Malicious,
        label: null,
      });

      const { getByTestId } = render(
        <DisplayURL url="https://malicious-site.com" />,
      );

      expect(getByTestId('trust-signal-icon-malicious')).toBeTruthy();
    });

    it('renders warning icon when trust state is warning', () => {
      mockUseOriginTrustSignals.mockReturnValue({
        state: TrustSignalDisplayState.Warning,
        label: null,
      });

      const { getByTestId } = render(
        <DisplayURL url="https://suspicious-site.com" />,
      );

      expect(getByTestId('trust-signal-icon-warning')).toBeTruthy();
    });

    it('renders verified icon for in-app browser requests when trust state is verified', () => {
      mockUseOriginTrustSignals.mockReturnValue({
        state: TrustSignalDisplayState.Verified,
        label: null,
      });

      const { getByTestId } = render(
        <DisplayURL
          url="https://uniswap.org"
          requestSource={AppConstants.REQUEST_SOURCES.IN_APP_BROWSER}
        />,
      );

      expect(getByTestId('trust-signal-icon-verified')).toBeTruthy();
    });

    it('does NOT render verified icon for WalletConnect requests (spoofable origin)', () => {
      mockUseOriginTrustSignals.mockReturnValue({
        state: TrustSignalDisplayState.Verified,
        label: null,
      });

      const { queryByTestId } = render(
        <DisplayURL
          url="https://uniswap.org"
          requestSource={AppConstants.REQUEST_SOURCES.WC}
        />,
      );

      // Should NOT show verified icon for WalletConnect
      expect(queryByTestId('trust-signal-icon-verified')).toBeNull();
    });

    it('does NOT render verified icon for SDK Remote requests (spoofable origin)', () => {
      mockUseOriginTrustSignals.mockReturnValue({
        state: TrustSignalDisplayState.Verified,
        label: null,
      });

      const { queryByTestId } = render(
        <DisplayURL
          url="https://aave.com"
          requestSource={AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN}
        />,
      );

      // Should NOT show verified icon for SDK Remote
      expect(queryByTestId('trust-signal-icon-verified')).toBeNull();
    });

    it('does NOT render verified icon when requestSource is undefined', () => {
      mockUseOriginTrustSignals.mockReturnValue({
        state: TrustSignalDisplayState.Verified,
        label: null,
      });

      const { queryByTestId } = render(
        <DisplayURL url="https://example.com" />,
      );

      // Conservative approach: no requestSource means we can't verify origin
      expect(queryByTestId('trust-signal-icon-verified')).toBeNull();
    });

    it('does not render any icon for unknown trust state', () => {
      mockUseOriginTrustSignals.mockReturnValue({
        state: TrustSignalDisplayState.Unknown,
        label: null,
      });

      const { queryByTestId, queryByText } = render(
        <DisplayURL
          url="https://random-dapp.com"
          requestSource={AppConstants.REQUEST_SOURCES.IN_APP_BROWSER}
        />,
      );

      expect(queryByTestId('trust-signal-icon-malicious')).toBeNull();
      expect(queryByTestId('trust-signal-icon-warning')).toBeNull();
      expect(queryByTestId('trust-signal-icon-verified')).toBeNull();
      expect(queryByText('HTTP')).toBeNull();
    });
  });

  describe('malicious and warning icons shown regardless of origin spoofability', () => {
    it('shows malicious icon for WalletConnect (even though origin is spoofable)', () => {
      mockUseOriginTrustSignals.mockReturnValue({
        state: TrustSignalDisplayState.Malicious,
        label: null,
      });

      const { getByTestId } = render(
        <DisplayURL
          url="https://claimed-malicious.com"
          requestSource={AppConstants.REQUEST_SOURCES.WC}
        />,
      );

      // Malicious should still be shown - we warn about the claimed malicious domain
      expect(getByTestId('trust-signal-icon-malicious')).toBeTruthy();
    });

    it('shows warning icon for SDK Remote (even though origin is spoofable)', () => {
      mockUseOriginTrustSignals.mockReturnValue({
        state: TrustSignalDisplayState.Warning,
        label: null,
      });

      const { getByTestId } = render(
        <DisplayURL
          url="https://claimed-suspicious.com"
          requestSource={AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN}
        />,
      );

      // Warning should still be shown - we warn about the claimed suspicious domain
      expect(getByTestId('trust-signal-icon-warning')).toBeTruthy();
    });
  });
});
