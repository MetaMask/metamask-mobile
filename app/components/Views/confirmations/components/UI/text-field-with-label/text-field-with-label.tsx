import React from 'react';

import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import TextField from '../../../../../../component-library/components/Form/TextField';
import { TextFieldProps } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import styleSheet from './text-field-with-label.styles';

export type TextFieldWithLabelProps = {
  error: string | boolean;
  inputType: string;
  label?: string;
} & TextFieldProps;

export const TextFieldWithLabel = (props: TextFieldWithLabelProps) => {
  const { error, inputType, label, ...restProps } = props;
  const { styles, theme } = useStyles(styleSheet, {});

  return (
    <>
      {label && (
        <Text variant={TextVariant.BodyMD} style={styles.label}>
          {label}
        </Text>
      )}
      <TextField autoCapitalize="none" autoCorrect={false} {...restProps} />
      {error && (
        <Text
          color={theme.colors.error.default}
          style={styles.error}
          testID={`${inputType}-error`}
          variant={TextVariant.BodySM}
        >
          {error}
        </Text>
      )}
    </>
  );
};
