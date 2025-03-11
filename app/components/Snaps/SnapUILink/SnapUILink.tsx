///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { LinkChildren } from '@metamask/snaps-sdk/jsx';
import React from 'react';
import { Linking, View } from 'react-native';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { TextColor } from '../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

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
export const SnapUILink: React.FC<SnapUILinkProps> = ({ href, children }) => {
  const label = (
    <>
      {children}
      <View
        /* eslint-disable-next-line react-native/no-inline-styles */
        style={{
          width: 4,
        }}
      />
      <Icon
        name={IconName.Export}
        color={IconColor.Primary}
        size={IconSize.Sm}
        /* eslint-disable-next-line react-native/no-inline-styles */
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
        }}
      />
    </>
  );

  return (
    <ButtonLink
      testID="snaps-ui-link"
      // @ts-expect-error This prop is not part of the type but it works.
      color={TextColor.Info}
      onPress={() => onPress(href)}
      label={label}
    />
  );
};
///: END:ONLY_INCLUDE_IF
