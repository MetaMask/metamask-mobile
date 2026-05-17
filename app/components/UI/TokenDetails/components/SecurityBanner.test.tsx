import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SecurityBanner } from './SecurityBanner';
import {
  IconAlertSeverity,
  FontWeight,
  IconAlert,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { ResultTypeConfig } from '../../SecurityTrust/utils/securityUtils';

describe('SecurityBanner', () => {
  const mockOnPress = jest.fn();
  const tokenSymbol = 'TEST';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMaliciousConfig = (): ResultTypeConfig => ({
    label: 'Malicious',
    textColor: 'text-error-default' as const,
    subtitle: 'This token is malicious',
    iconAlertSeverity: IconAlertSeverity.Error,
    icon: undefined,
    iconColor: undefined,
  });

  const createWarningConfig = (): ResultTypeConfig => ({
    label: 'Warning',
    textColor: 'text-warning-default' as const,
    subtitle: 'This token is suspicious',
    iconAlertSeverity: IconAlertSeverity.Warning,
    icon: undefined,
    iconColor: undefined,
  });

  describe('Malicious token banner', () => {
    it('renders malicious banner with correct testID', () => {
      const { getByTestId } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      expect(getByTestId('security-banner-malicious')).toBeOnTheScreen();
    });

    it('displays malicious token title', () => {
      const { getByText } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      expect(
        getByText(strings('security_trust.malicious_token_title')),
      ).toBeOnTheScreen();
    });

    it('displays malicious token description with token symbol', () => {
      const { getByText } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      expect(
        getByText(
          strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          }),
        ),
      ).toBeOnTheScreen();
    });

    it('renders IconAlert with Error severity for malicious tokens', () => {
      const { UNSAFE_getByType } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      const iconAlert = UNSAFE_getByType(IconAlert);
      expect(iconAlert).toBeTruthy();
    });

    it('calls onPress when malicious banner is pressed', () => {
      const { getByTestId } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      fireEvent.press(getByTestId('security-banner-malicious'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Warning token banner', () => {
    it('renders warning banner with correct testID', () => {
      const { getByTestId } = render(
        <SecurityBanner
          securityConfig={createWarningConfig()}
          backgroundClass="bg-warning-muted"
          titleFontWeight={FontWeight.Medium}
          testID="security-banner-warning"
          description={strings('security_trust.suspicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      expect(getByTestId('security-banner-warning')).toBeOnTheScreen();
    });

    it('displays suspicious token description with token symbol', () => {
      const { getByText } = render(
        <SecurityBanner
          securityConfig={createWarningConfig()}
          backgroundClass="bg-warning-muted"
          titleFontWeight={FontWeight.Medium}
          testID="security-banner-warning"
          description={strings('security_trust.suspicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      expect(
        getByText(
          strings('security_trust.suspicious_token_description', {
            symbol: tokenSymbol,
          }),
        ),
      ).toBeOnTheScreen();
    });

    it('does not display malicious token description for warning tokens', () => {
      const { queryByText } = render(
        <SecurityBanner
          securityConfig={createWarningConfig()}
          backgroundClass="bg-warning-muted"
          titleFontWeight={FontWeight.Medium}
          testID="security-banner-warning"
          description={strings('security_trust.suspicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      expect(
        queryByText(
          strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          }),
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders IconAlert with Warning severity for warning tokens', () => {
      const { UNSAFE_getByType } = render(
        <SecurityBanner
          securityConfig={createWarningConfig()}
          backgroundClass="bg-warning-muted"
          titleFontWeight={FontWeight.Medium}
          testID="security-banner-warning"
          description={strings('security_trust.suspicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      const iconAlert = UNSAFE_getByType(IconAlert);
      expect(iconAlert).toBeTruthy();
    });

    it('calls onPress when warning banner is pressed', () => {
      const { getByTestId } = render(
        <SecurityBanner
          securityConfig={createWarningConfig()}
          backgroundClass="bg-warning-muted"
          titleFontWeight={FontWeight.Medium}
          testID="security-banner-warning"
          description={strings('security_trust.suspicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      fireEvent.press(getByTestId('security-banner-warning'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Spam token banner', () => {
    it('renders warning banner testID for spam tokens', () => {
      const { getByTestId } = render(
        <SecurityBanner
          securityConfig={createWarningConfig()}
          backgroundClass="bg-warning-muted"
          titleFontWeight={FontWeight.Medium}
          testID="security-banner-warning"
          description={strings('security_trust.suspicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      expect(getByTestId('security-banner-warning')).toBeOnTheScreen();
    });

    it('displays suspicious token description for spam tokens', () => {
      const { getByText } = render(
        <SecurityBanner
          securityConfig={createWarningConfig()}
          backgroundClass="bg-warning-muted"
          titleFontWeight={FontWeight.Medium}
          testID="security-banner-warning"
          description={strings('security_trust.suspicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      expect(
        getByText(
          strings('security_trust.suspicious_token_description', {
            symbol: tokenSymbol,
          }),
        ),
      ).toBeOnTheScreen();
    });

    it('calls onPress when spam banner is pressed', () => {
      const { getByTestId } = render(
        <SecurityBanner
          securityConfig={createWarningConfig()}
          backgroundClass="bg-warning-muted"
          titleFontWeight={FontWeight.Medium}
          testID="security-banner-warning"
          description={strings('security_trust.suspicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      fireEvent.press(getByTestId('security-banner-warning'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('IconAlert rendering', () => {
    it('renders IconAlert when iconAlertSeverity is provided', () => {
      const { UNSAFE_getByType } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      const iconAlert = UNSAFE_getByType(IconAlert);
      expect(iconAlert).toBeTruthy();
    });

    it('does not render IconAlert when iconAlertSeverity is undefined', () => {
      const configWithoutIcon = {
        ...createMaliciousConfig(),
        iconAlertSeverity: undefined,
      };

      const { UNSAFE_queryByType } = render(
        <SecurityBanner
          securityConfig={configWithoutIcon}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      const iconAlert = UNSAFE_queryByType(IconAlert);
      expect(iconAlert).toBeNull();
    });
  });

  describe('Token symbol interpolation', () => {
    it('correctly interpolates token symbol in warning message', () => {
      const customSymbol = 'CUSTOM';
      const { getByText } = render(
        <SecurityBanner
          securityConfig={createWarningConfig()}
          backgroundClass="bg-warning-muted"
          titleFontWeight={FontWeight.Medium}
          testID="security-banner-warning"
          description={strings('security_trust.suspicious_token_description', {
            symbol: customSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      expect(
        getByText(
          strings('security_trust.suspicious_token_description', {
            symbol: customSymbol,
          }),
        ),
      ).toBeOnTheScreen();
    });

    it('correctly interpolates token symbol in malicious description', () => {
      const customSymbol = 'SCAM';
      const { getByText } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: customSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      expect(
        getByText(
          strings('security_trust.malicious_token_description', {
            symbol: customSymbol,
          }),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Multiple press handling', () => {
    it('calls onPress multiple times when pressed multiple times', () => {
      const { getByTestId } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
        />,
      );

      const banner = getByTestId('security-banner-malicious');
      fireEvent.press(banner);
      fireEvent.press(banner);
      fireEvent.press(banner);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Non-interactive mode', () => {
    it('renders non-interactive banner when onPress is not provided', () => {
      const { getByTestId } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          })}
        />,
      );

      const banner = getByTestId('security-banner-malicious');
      expect(banner).toBeOnTheScreen();
    });

    it('does not call onPress when banner is pressed in non-interactive mode', () => {
      const { getByTestId } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          })}
        />,
      );

      const banner = getByTestId('security-banner-malicious');
      fireEvent.press(banner);

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Custom className', () => {
    it('applies custom className when provided', () => {
      const { getByTestId } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          })}
          onPress={mockOnPress}
          className="mx-0 mb-0 mt-3"
        />,
      );

      expect(getByTestId('security-banner-malicious')).toBeOnTheScreen();
    });
  });

  describe('Custom title and description', () => {
    it('displays custom description instead of default for malicious', () => {
      const customDescription = 'Custom malicious message';
      const { getByText, queryByText } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={strings('security_trust.malicious_token_title')}
          description={customDescription}
          onPress={mockOnPress}
        />,
      );

      expect(getByText(customDescription)).toBeOnTheScreen();
      expect(
        queryByText(
          strings('security_trust.malicious_token_description', {
            symbol: tokenSymbol,
          }),
        ),
      ).not.toBeOnTheScreen();
    });

    it('hides title when title prop is not provided', () => {
      const customDescription = 'Custom malicious message';
      const { getByText, queryByText } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          description={customDescription}
          onPress={mockOnPress}
        />,
      );

      expect(getByText(customDescription)).toBeOnTheScreen();
      expect(
        queryByText(strings('security_trust.malicious_token_title')),
      ).not.toBeOnTheScreen();
    });

    it('displays custom description instead of default for warning', () => {
      const customDescription = 'Custom warning message';
      const { getByText, queryByText } = render(
        <SecurityBanner
          securityConfig={createWarningConfig()}
          backgroundClass="bg-warning-muted"
          titleFontWeight={FontWeight.Medium}
          testID="security-banner-warning"
          description={customDescription}
          onPress={mockOnPress}
        />,
      );

      expect(getByText(customDescription)).toBeOnTheScreen();
      expect(
        queryByText(
          strings('security_trust.suspicious_token_description', {
            symbol: tokenSymbol,
          }),
        ),
      ).not.toBeOnTheScreen();
    });

    it('displays custom title when provided', () => {
      const customTitle = 'Custom Title';
      const customDescription = 'Custom description';
      const { getByText } = render(
        <SecurityBanner
          securityConfig={createMaliciousConfig()}
          backgroundClass="bg-error-muted"
          titleFontWeight={FontWeight.Bold}
          testID="security-banner-malicious"
          title={customTitle}
          description={customDescription}
          onPress={mockOnPress}
        />,
      );

      expect(getByText(customTitle)).toBeOnTheScreen();
      expect(getByText(customDescription)).toBeOnTheScreen();
    });
  });
});
