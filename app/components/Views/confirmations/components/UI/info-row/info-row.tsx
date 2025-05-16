import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { IconColor } from '../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import Tooltip from '../Tooltip/Tooltip';
import styleSheet from './info-row.styles';
import CopyIcon from './copy-icon/copy-icon';

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
  valueOnNewLine = false,
}: InfoRowProps) => {
  const { styles } = useStyles(styleSheet, {});

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
      {valueOnNewLine ? (
        <View style={styles.valueOnNewLineContainer}>
          {ValueComponent}
        </View>
      ): null}
    </>
  );
};

export default InfoRow;
