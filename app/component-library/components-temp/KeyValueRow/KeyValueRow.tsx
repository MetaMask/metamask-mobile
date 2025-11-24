import { useStyles } from '../../hooks';
import React from 'react';
import stylesheet from './KeyValueRow.styles';
import {
  KeyValueRowProps,
  KeyValueRowFieldIconSides,
  KeyValueRowSectionAlignments,
} from './KeyValueRow.types';
import Icon from '../../components/Icons/Icon';
import { View } from 'react-native';
import KeyValueSection from './KeyValueSection/KeyValueSection';
import KeyValueRowLabel from './KeyValueLabel/KeyValueLabel';
import KeyValueRowRoot from './KeyValueRoot/KeyValueRoot';

/**
 * Prebuilt convenience component to format and render a key/value KeyValueRowLabel pair.
 * The KeyValueRowLabel component has props to display a tooltip and icon.
 *
 * Examples are in the Storybook: [StorybookLink](./KeyValueRow.stories.tsx)
 *
 * @param {Object} props - Component props
 * @param {KeyValueRowField} props.field - Represents the left side of the key value row pair
 * @param {KeyValueRowField} props.value - Represents the right side of the key value row pair
 * @param {ViewProps} [props.style] - Optional styling
 *
 * @returns {JSX.Element} The rendered KeyValueRow component.
 */
const KeyValueRow = React.memo(({ field, value, style }: KeyValueRowProps) => {
  const { styles } = useStyles(stylesheet, {});

  // Field (left side)
  const fieldIcon = field?.icon;
  const shouldShowFieldIcon = fieldIcon?.name;

  // Value (right side)
  const valueIcon = value?.icon;
  const shouldShowValueIcon = valueIcon?.name;

  return (
    <KeyValueRowRoot style={[style]}>
      <KeyValueSection>
        <View style={styles.flexRow}>
          {shouldShowFieldIcon &&
            (fieldIcon.side === KeyValueRowFieldIconSides.LEFT ||
              fieldIcon.side === KeyValueRowFieldIconSides.BOTH ||
              !fieldIcon?.side) && <Icon {...fieldIcon} />}
          <KeyValueRowLabel label={field.label} tooltip={field.tooltip} />
          {shouldShowFieldIcon &&
            (fieldIcon?.side === KeyValueRowFieldIconSides.RIGHT ||
              fieldIcon?.side === KeyValueRowFieldIconSides.BOTH) && (
              <Icon {...fieldIcon} />
            )}
        </View>
      </KeyValueSection>
      <KeyValueSection align={KeyValueRowSectionAlignments.RIGHT}>
        <View style={styles.flexRow}>
          {shouldShowValueIcon &&
            (valueIcon?.side === KeyValueRowFieldIconSides.LEFT ||
              valueIcon?.side === KeyValueRowFieldIconSides.BOTH ||
              !valueIcon?.side) && <Icon {...valueIcon} />}
          <KeyValueRowLabel label={value.label} tooltip={value.tooltip} />
          {shouldShowValueIcon &&
            (valueIcon?.side === KeyValueRowFieldIconSides.RIGHT ||
              valueIcon?.side === KeyValueRowFieldIconSides.BOTH) && (
              <Icon {...valueIcon} />
            )}
        </View>
      </KeyValueSection>
    </KeyValueRowRoot>
  );
});

/**
 * Exported sub-components to provide a base for new KeyValueRow variants.
 */
export const KeyValueRowStubs = {
  Root: KeyValueRowRoot,
  Section: KeyValueSection,
  Label: KeyValueRowLabel,
};

export default KeyValueRow;
