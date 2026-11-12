import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { TextButton, TextVariant } from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import type { InviteTermsLink as InviteTermsLinkValue } from '../utils/inviteTermsLink';

/**
 * The inline "Learn more" link after invite copy.
 *
 * Renders nothing when the link was not resolved. While `disabled`, the label
 * stays visible but does not open the browser, so a registration in flight is
 * not abandoned.
 */
interface InviteTermsLinkProps {
  link: InviteTermsLinkValue | null;
  testID: string;
  disabled?: boolean;
}

export const InviteTermsLink = ({
  link,
  testID,
  disabled = false,
}: InviteTermsLinkProps): JSX.Element | null => {
  const navigation = useNavigation<AppNavigationProp>();
  const handlePress = useCallback((): void => {
    if (!link || disabled) {
      return;
    }
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: link.url,
        timestamp: Date.now(),
      },
    });
  }, [disabled, link, navigation]);

  if (!link) {
    return null;
  }

  return (
    <TextButton
      variant={TextVariant.BodyMd}
      accessibilityState={disabled ? { disabled: true } : undefined}
      onPress={disabled ? undefined : handlePress}
      testID={testID}
    >
      {link.label}
    </TextButton>
  );
};
