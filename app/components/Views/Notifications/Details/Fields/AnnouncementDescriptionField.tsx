import React, { useState, useMemo, useCallback } from 'react';
import { View, Linking } from 'react-native';
import Html, {
  MixedStyleDeclaration,
  TNode,
  CustomTextualRenderer,
} from 'react-native-render-html';
import { ModalFieldAnnouncementDescription } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import SharedDeeplinkManager from '../../../../../core/DeeplinkManager/SharedDeeplinkManager';
import AppConstants from '../../../../../core/AppConstants';
import Logger from '../../../../../util/Logger';

type AnnouncementDescriptionFieldProps = ModalFieldAnnouncementDescription;

const extractTextFromNode = (node: TNode | string): string => {
  if (typeof node === 'string') {
    return node;
  }
  if (node.type === 'text') {
    return node.data || '';
  }
  if (node.children && node.children.length > 0) {
    return node.children.map(extractTextFromNode).join('').trim();
  }
  return '';
};

function AnnouncementDescriptionField(
  props: AnnouncementDescriptionFieldProps,
) {
  const { styles } = useStyles();

  const [width, setWidth] = useState(0);

  const handleLinkPress = useCallback((href: string) => {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      Linking.openURL(href).catch((error) =>
        Logger.error(error as Error, 'Error opening external URL'),
      );
    } else {
      // Handle deeplinks
      SharedDeeplinkManager.parse(href, {
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      }).catch((error) =>
        Logger.error(error as Error, 'Error parsing deeplink'),
      );
    }
  }, []);

  const renderers = useMemo(
    () => ({
      a: ((rendererProps) => {
        const { tnode } = rendererProps;
        const href = tnode.attributes.href || '';
        const textContent = extractTextFromNode(tnode).trim();

        return (
          <Button
            variant={ButtonVariants.Link}
            label={textContent || href}
            onPress={() => handleLinkPress(href)}
          />
        );
      }) as CustomTextualRenderer,
    }),
    [handleLinkPress],
  );

  const tagsStyles = useMemo(
    () => ({
      a: {
        textDecorationLine: 'none' as const,
      },
    }),
    [],
  );

  return (
    <View
      style={styles.row}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Html
        source={{ html: props.description }}
        contentWidth={width}
        baseStyle={styles.announcementDescriptionText as MixedStyleDeclaration}
        renderers={renderers}
        tagsStyles={tagsStyles}
      />
    </View>
  );
}

export default AnnouncementDescriptionField;
