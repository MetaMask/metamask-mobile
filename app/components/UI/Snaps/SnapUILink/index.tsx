///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { LinkChildren } from '@metamask/snaps-sdk/jsx';
import Text, { TextColor, TextVariant } from '../../../../component-library/components/Texts/Text';
import React from 'react';
import { Linking } from 'react-native';

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

export const SnapUILink: React.FC<SnapUILinkProps> = ({
  href,
children
}) => (
    <Text
    testID="snaps-ui-link"
    variant={TextVariant.BodyMD}
    color={TextColor.Info}
    onPress={() => onPress(href)}
  >
    {children}
  </Text>
  );
///: END:ONLY_INCLUDE_IF
