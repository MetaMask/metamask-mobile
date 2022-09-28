// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import ButtonTertiary from '../../components/Buttons/ButtonTertiary';
import { ButtonBaseSize } from '../../components/Buttons/ButtonBase';
import Loader from '../Loader';

// Internal dependencies.
import { SheetActionsProps } from './SheetActions.types';
import styleSheet from './SheetActions.styles';

const SheetActions = ({ actions }: SheetActionsProps) => {
  const { styles } = useStyles(styleSheet, {});

  const renderActions = useCallback(
    () =>
      actions.map(
        ({ label, onPress, testID, isLoading, disabled, variant }, index) => {
          const key = `${label}-${index}`;
          return (
            <React.Fragment key={key}>
              {actions.length > 1 && <View style={styles.separator} />}
              <View>
                <ButtonTertiary
                  testID={testID}
                  onPress={onPress}
                  label={label}
                  size={ButtonBaseSize.Lg}
                  disabled={disabled || isLoading}
                  /* eslint-disable-next-line */
                  style={{ opacity: disabled ? 0.5 : 1 }}
                  variant={variant}
                />
                {isLoading && <Loader size={'small'} />}
              </View>
            </React.Fragment>
          );
        },
      ),
    [actions, styles.separator],
  );

  return <>{renderActions()}</>;
};

export default SheetActions;
