import React, { ReactNode } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextVariant,
  TextColor
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import Tooltip from '../Tooltip';
import styleSheet from './InfoRow.styles';
import { IconColor } from '../../../../../../component-library/components/Icons/Icon';
import CopyIcon from './CopyIcon/CopyIcon';

export interface InfoRowProps {
  label: string;
  children?: ReactNode | string;
  onTooltipPress?: () => void;
  tooltip?: string;
  style?: Record<string, unknown>;
  labelChildren?: React.ReactNode;
  testID?: string;
  variant?: TextColor;
  copyText?: string;
  isCompact?: boolean;
  valueOnNewLine?: boolean;
}

const InfoRow = ({
  label,
  children,
  onTooltipPress,
  style = {},
  labelChildren = null,
  tooltip,
  testID,
  variant = TextColor.Default,
  copyText,
  isCompact = false,
  valueOnNewLine = false,
}: InfoRowProps) => {
  const { styles } = useStyles(styleSheet, { isCompact });

  const ValueComponent = typeof children === 'string' ? (
      <Text style={styles.value}>{children}</Text>
    ) : (
      <>{children}</>
    )

  return (
    <>
      <View
        style={{ ...styles.container, ...style }}
        testID={testID ?? 'info-row'}
      >
        {Boolean(label) && (
          <View style={styles.labelContainer}>
            <Text variant={TextVariant.BodyMDMedium} color={variant} >{label}</Text>
            {labelChildren}
            {!labelChildren && tooltip && (
              <Tooltip content={tooltip} onPress={onTooltipPress} title={label} />
            )}
          </View>
        )}
        {valueOnNewLine ? null : ValueComponent}
        {copyText && (
          <CopyIcon
            textToCopy={copyText ?? ''}
            color={IconColor.Muted}
          />
        )}
      </View>
      <View style={styles.valueOnNewLineContainer}>
        {valueOnNewLine ? ValueComponent : null}
      </View>
    </>
  );
};

export default InfoRow;
