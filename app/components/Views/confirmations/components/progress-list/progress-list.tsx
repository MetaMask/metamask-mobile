import React from 'react';
import { Box } from '../../../../UI/Box/Box';
import { FlexDirection } from '../../../../UI/Box/box.types';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './progress-list.styles';

export function ProgressList({
  children,
  showConnectors = true,
}: {
  children: React.ReactNode;
  showConnectors?: boolean;
}) {
  const { styles } = useStyles(styleSheet, {});
  const childArray = React.Children.toArray(children).filter(Boolean);

  return (
    <Box style={styles.container}>
      {childArray.map((child, index) => (
        <React.Fragment key={React.isValidElement(child) ? child.key : index}>
          {child}
          {showConnectors && index < childArray.length - 1 && (
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
      ))}
    </Box>
  );
}
