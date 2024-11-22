import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Box } from '../../../../components/UI/Box';
import { isEqual } from 'lodash';
import { getMemoizedInterface } from '../../../../selectors/snaps/interfaceController';

import { SnapInterfaceContextProvider } from './SnapInterfaceContext';
import { mapToTemplate } from './utils';
import TemplateRenderer from '../../TemplateRenderer';

// Component that maps Snaps UI JSON format to MetaMask Template Renderer format
const SnapUIRendererComponent = ({
  snapId,
  isLoading = false,
  interfaceId,
}) => {
  const interfaceState = useSelector(
    (state) => getMemoizedInterface(state, interfaceId),
    // We only want to update the state if the content has changed.
    // We do this to avoid useless re-renders.
    (oldState, newState) => isEqual(oldState.content, newState.content),
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

SnapUIRendererComponent.propTypes = {
  snapId: PropTypes.string,
  isLoading: PropTypes.bool,
  interfaceId: PropTypes.string,
};
