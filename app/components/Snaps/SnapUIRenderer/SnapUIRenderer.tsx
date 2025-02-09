import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Box } from '../../UI/Box';
import { isEqual } from 'lodash';
import { getMemoizedInterface } from '../../../selectors/snaps/interfaceController';
import { SnapInterfaceContextProvider } from '../SnapInterfaceContext';
import { mapToTemplate } from './utils';
import TemplateRenderer from '../../UI/TemplateRenderer';
import { ActivityIndicator, Dimensions, StyleSheet } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { Container } from '@metamask/snaps-sdk/jsx';
import { strings } from '../../../../locales/i18n';

interface SnapUIRendererProps {
  snapId: string;
  isLoading: boolean;
  interfaceId: string;
  onCancel: () => void;
  useFooter: boolean;
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    height: Dimensions.get('window').height * 0.5,
  },
});

const SnapUIRendererComponent = ({
  snapId,
  isLoading = false,
  interfaceId,
  onCancel,
  useFooter,
}: SnapUIRendererProps) => {
  const interfaceState = useSelector(
    (state) => getMemoizedInterface(state, interfaceId),
    (oldState, newState) =>
      isEqual(oldState?.content ?? null, newState?.content ?? null),
  );

  const rawContent = interfaceState?.content;
  const content =
    rawContent?.type === 'Container' || !rawContent
      ? rawContent
      : Container({ children: rawContent });

  const sections = useMemo(
    () =>
      content &&
      mapToTemplate({
        map: {},
        element: content,
        useFooter,
        onCancel,
        t: strings,
      }),
    [content, useFooter, onCancel],
  );

  if (isLoading || !content) {
    return <ActivityIndicator size="large" color={Colors.primary} />;
  }

  const { state: initialState, context } = interfaceState;
  return (
    <Box style={styles.root}>
      <SnapInterfaceContextProvider
        snapId={snapId}
        interfaceId={interfaceId}
        initialState={initialState}
        context={context}
      >
        <TemplateRenderer sections={sections} />
      </SnapInterfaceContextProvider>
    </Box>
  );
};

export const SnapUIRenderer = memo(
  SnapUIRendererComponent,
  (prevProps, nextProps) => isEqual(prevProps, nextProps),
);
