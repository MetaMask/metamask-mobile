// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import ButtonTertiary from '../../components/Buttons/ButtonTertiary';
import { ButtonBaseSize } from '../../components/Buttons/ButtonBase';

// Internal dependencies.
import { SheetActionsProps } from './SheetActions.types';
import styleSheet from './SheetActions.styles';

const SheetActions = ({ actions }: SheetActionsProps) => {
  const { styles } = useStyles(styleSheet, {});

  const renderActions = () =>
    actions.map(({ label, onPress }, index) => {
      const key = `${label}-${index}`;
      return (
        <React.Fragment key={key}>
          {actions.length > 1 && <View style={styles.separator} />}
          <ButtonTertiary
            onPress={onPress}
            label={label}
            size={ButtonBaseSize.Lg}
          />
        </React.Fragment>
      );
    });

  return <>{renderActions()}</>;
};

export default SheetActions;
