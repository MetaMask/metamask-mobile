import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Box } from '../../../../components/UI/Box';
import { isEqual } from 'lodash';
import { getMemoizedInterface } from '../../../../selectors/snaps/interfaceController';

import { SnapInterfaceContextProvider } from './SnapInterfaceContext';
import { mapToTemplate } from './utils';
import TemplateRenderer from '../../../UI/TemplateRenderer';

interface SnapUIRendererProps {
  snapId: string;
  isLoading: boolean;
  interfaceId: string;
}

// Component that maps Snaps UI JSON format to MetaMask Template Renderer format
const SnapUIRendererComponent = ({
  snapId,
  isLoading = false,
  interfaceId,
}: SnapUIRendererProps) => {
  const interfaceState = useSelector(
    (state) => getMemoizedInterface(state, interfaceId),
    // We only want to update the state if the content has changed.
    // We do this to avoid useless re-renders.
    // oldState {"content": {"key": null, "props": {"children": [Array]}, "type": "Box"}, "context": null, "snapId": "npm:@metamask/dialog-example-snap", "state": {}} newState undefined
    (oldState, newState) =>
      isEqual(oldState?.content ?? null, newState?.content ?? null),
  );

  const content = interfaceState?.content;

  // sections are memoized to avoid useless re-renders if one of the parents element re-renders.
  const sections = useMemo(
    () =>
      content &&
      mapToTemplate({
        map: {},
        element: content,
      }),
    [content],
  );

  if (isLoading || !content) {
    return null; // TODO: Add a loading state
  }

  const { state: initialState, context } = interfaceState;

  return (
    <Box>
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

// SnapUIRenderer is memoized to avoid useless re-renders if one of the parents element re-renders.
export const SnapUIRenderer = memo(
  SnapUIRendererComponent,
  (prevProps, nextProps) => isEqual(prevProps, nextProps),
);
