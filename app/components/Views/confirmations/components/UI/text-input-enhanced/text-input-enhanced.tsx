import React from 'react';

import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import TextField, {
  TextFieldSize,
} from '../../../../../../component-library/components/Form/TextField';
import { TextFieldProps } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import styleSheet from './text-input-enhanced.styles';

export type TextInputEnhancedProps = {
  error: string | boolean;
  key: string;
  label: string;
} & TextFieldProps;

export const TextInputEnhanced = (props: TextInputEnhancedProps) => {
  const { error, key, label, ...restProps } = props;
  const { styles, theme } = useStyles(styleSheet, {});

  return (
    <>
      {label && (
        <Text variant={TextVariant.BodyMD} style={styles.label}>
          {label}
        </Text>
      )}
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        size={TextFieldSize.Lg}
        {...restProps}
      />
      {error && (
        <Text
          color={theme.colors.error.default}
          style={styles.error}
          testID={`${key}-error`}
          variant={TextVariant.BodySM}
        >
          {error}
        </Text>
      )}
    </>
  );
};
