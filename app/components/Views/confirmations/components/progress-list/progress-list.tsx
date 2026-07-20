import React, { createContext, useContext } from 'react';
import { Box } from '../../../../UI/Box/Box';
import { FlexDirection } from '../../../../UI/Box/box.types';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './progress-list.styles';

/**
 * `status-icon` renders each item with a status icon (checkmark / cross) and
 * optional solid connector bars between items. `dot` renders the
 * Activity-redesign pattern: a small status-coloured dot per item joined by a
 * built-in dotted line (`showConnectors` does not apply).
 */
export type ProgressListVariant = 'status-icon' | 'dot';

interface ProgressListItemMeta {
  variant: ProgressListVariant;
  isLast: boolean;
}

const ProgressListItemMetaContext = createContext<ProgressListItemMeta>({
  variant: 'status-icon',
  isLast: true,
});

export function useProgressListItemMeta(): ProgressListItemMeta {
  return useContext(ProgressListItemMetaContext);
}

export function ProgressList({
  children,
  showConnectors = true,
  variant = 'status-icon',
}: {
  children: React.ReactNode;
  showConnectors?: boolean;
  variant?: ProgressListVariant;
}) {
  const { styles } = useStyles(styleSheet, {});
  const childArray = React.Children.toArray(children).filter(Boolean);

  return (
    <Box style={styles.container}>
      {childArray.map((child, index) => {
        const isLast = index === childArray.length - 1;

        return (
          <React.Fragment key={React.isValidElement(child) ? child.key : index}>
            <ProgressListItemMetaContext.Provider value={{ variant, isLast }}>
              {child}
            </ProgressListItemMetaContext.Provider>
            {variant === 'status-icon' && showConnectors && !isLast && (
              <Box
                testID="progress-list-divider"
                flexDirection={FlexDirection.Row}
              >
                <Box style={styles.dividerContainer}>
                  <Box style={styles.dividerBar} />
                </Box>
              </Box>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
