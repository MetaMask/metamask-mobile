import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Box } from '../../UI/Box/Box';
import { isEqual } from 'lodash';
import { getMemoizedInterface } from '../../../selectors/snaps/interfaceController';
import { SnapInterfaceContextProvider } from '../SnapInterfaceContext';
import { mapToTemplate } from './utils';
import TemplateRenderer from '../../UI/TemplateRenderer';
import { ActivityIndicator } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { Container } from '@metamask/snaps-sdk/jsx';
import { strings } from '../../../../locales/i18n';
import styles from './SnapUIRenderer.styles';
import { RootState } from '../../../reducers';
import { TemplateRendererInput } from '../../UI/TemplateRenderer/types';

interface SnapUIRendererProps {
  snapId: string;
  isLoading: boolean;
  interfaceId: string;
  onCancel: () => void;
  useFooter: boolean;
}

const SnapUIRendererComponent = ({
  snapId,
  isLoading = false,
  interfaceId,
  onCancel,
  useFooter,
}: SnapUIRendererProps) => {
  const interfaceState = useSelector(
    (state: RootState) => getMemoizedInterface(state, interfaceId),
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
      (mapToTemplate({
        map: {},
        element: content,
        useFooter,
        onCancel,
        t: strings,
      }) as TemplateRendererInput),
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
