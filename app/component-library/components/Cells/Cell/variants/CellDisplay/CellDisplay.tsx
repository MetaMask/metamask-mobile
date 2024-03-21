/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import CellBase from '../../foundation/CellBase';
import Card from '../../../../Cards/Card';
import { CellModalSelectorsIDs } from '../../../../../../../e2e/selectors/Modals/CellModal.selectors';

// Internal dependencies.
import styleSheet from './CellDisplay.styles';
import { CellDisplayProps } from './CellDisplay.types';

const CellDisplay = ({ style, ...props }: CellDisplayProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <Card style={styles.base} testID={CellModalSelectorsIDs.DISPLAY} {...props}>
      <CellBase {...props} />
    </Card>
  );
};

export default CellDisplay;
