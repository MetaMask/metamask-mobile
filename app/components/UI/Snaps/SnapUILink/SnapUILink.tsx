///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { LinkChildren } from '@metamask/snaps-sdk/jsx';
import React from 'react';
import { Linking } from 'react-native';
import ButtonLink from '../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { TextColor } from '../../../../component-library/components/Texts/Text';

export interface SnapUILinkProps {
  children: LinkChildren;
  href: string;
}

const validateUrl = (href: string) => {
  if (!href.startsWith('https://')) {
    throw new Error('Invalid URL');
  }
};

const onPress = (href: string) => {
  validateUrl(href);
  Linking.openURL(href);
};

// TODO: This component should show a modal for links when not using preinstalled Snaps
// TODO: This component should have an icon next to it
export const SnapUILink: React.FC<SnapUILinkProps> = ({ href, children }) => (
  <ButtonLink
    testID="snaps-ui-link"
    // @ts-expect-error This prop is not part of the type but it works.
    color={TextColor.Info}
    onPress={() => onPress(href)}
    label={children}
  />
);
///: END:ONLY_INCLUDE_IF
