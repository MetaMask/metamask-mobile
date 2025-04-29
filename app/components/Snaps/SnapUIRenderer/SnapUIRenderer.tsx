import React, { memo, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { isEqual } from 'lodash';
import { getMemoizedInterface } from '../../../selectors/snaps/interfaceController';
import { SnapInterfaceContextProvider } from '../SnapInterfaceContext';
import { mapToTemplate } from './utils';
import TemplateRenderer from '../../UI/TemplateRenderer';
import { ActivityIndicator, View, ViewStyle } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { Container } from '@metamask/snaps-sdk/jsx';
import { strings } from '../../../../locales/i18n';
import styles from './SnapUIRenderer.styles';
import { RootState } from '../../../reducers';
import { TemplateRendererComponent } from '../../UI/TemplateRenderer/types';
import { useTheme } from '../../../util/theme';

interface SnapUIRendererProps {
  snapId: string;
  isLoading?: boolean;
  interfaceId: string;
  onCancel?: () => void;
  useFooter: boolean;
  style?: ViewStyle;
  PERF_DEBUG?: boolean; // DO NOT USE IN PRODUCTION
}

// Component for tracking the number of re-renders
// DO NOT USE IN PRODUCTION
const PerformanceTracker = () => {
  const rendersRef = useRef(0);
  rendersRef.current += 1;

  return <View testID="performance" data-renders={rendersRef.current} />;
};

const SnapUIRendererComponent = ({
  snapId,
  isLoading = false,
  interfaceId,
  onCancel,
  useFooter,
  style,
  PERF_DEBUG,
}: SnapUIRendererProps) => {
  const theme = useTheme();

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
        theme,
      }) as TemplateRendererComponent),
    [content, useFooter, onCancel, theme],
  );

  if (isLoading || !content) {
    return <ActivityIndicator size="large" color={Colors.primary} />;
  }

  const { state: initialState, context } = interfaceState;
  return (
    <View style={[styles.root, style]}>
      <SnapInterfaceContextProvider
        snapId={snapId}
        interfaceId={interfaceId}
        initialState={initialState}
        context={context}
      >
        <TemplateRenderer sections={sections} />
        {PERF_DEBUG && <PerformanceTracker />}
      </SnapInterfaceContextProvider>
    </View>
  );
};

export const SnapUIRenderer = memo(
  SnapUIRendererComponent,
  (prevProps, nextProps) => isEqual(prevProps, nextProps),
);
