/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import CellBase from '../../foundation/CellBase';
import Card from '../../../../Cards/Card';

// Internal dependencies.
import styleSheet from './CellDisplay.styles';
import { CellDisplayProps } from './CellDisplay.types';
import { CELLDISPLAY_TEST_ID } from './CellDisplay.constants';

const CellDisplay = ({ style, ...props }: CellDisplayProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <Card style={styles.base} testID={CELLDISPLAY_TEST_ID} {...props}>
      <CellBase {...props} />
    </Card>
  );
};

export default CellDisplay;
