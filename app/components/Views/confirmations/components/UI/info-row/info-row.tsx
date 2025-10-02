import React, { ReactNode } from 'react';
import { View } from 'react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import Tooltip from '../Tooltip/Tooltip';
import styleSheet from './info-row.styles';
import CopyIcon from './copy-icon/copy-icon';

export interface InfoRowProps {
  label: string;
  children?: ReactNode | string;
  onTooltipPress?: () => void;
  tooltip?: ReactNode;
  tooltipTitle?: string;
  style?: Record<string, unknown>;
  labelChildren?: React.ReactNode;
  testID?: string;
  variant?: TextColor;
  copyText?: string;
  valueOnNewLine?: boolean;
  withIcon?: {
    color: IconColor;
    size: IconSize;
    name: IconName;
  };
}

const InfoRow = ({
  label,
  children,
  onTooltipPress,
  style = {},
  labelChildren = null,
  tooltip,
  tooltipTitle,
  testID,
  variant = TextColor.Alternative,
  copyText,
  valueOnNewLine = false,
  withIcon,
}: InfoRowProps) => {
  const { styles } = useStyles(styleSheet, {});

  const ValueComponent =
    typeof children === 'string' ? (
      <Text style={styles.value}>{children}</Text>
    ) : (
      <>{children}</>
    );

  return (
    <>
      <View
        style={{ ...styles.container, ...style }}
        testID={testID ?? 'info-row'}
      >
        {Boolean(label) && (
          <View style={styles.labelContainer}>
            <Text variant={TextVariant.BodyMDMedium} color={variant}>
              {label}
            </Text>
            {labelChildren}
            {!labelChildren && tooltip && (
              <Tooltip
                content={tooltip}
                onPress={onTooltipPress}
                title={tooltipTitle ?? label}
              />
            )}
          </View>
        )}
        {valueOnNewLine ? null : ValueComponent}
        {copyText && (
          <CopyIcon textToCopy={copyText ?? ''} color={IconColor.Muted} />
        )}
        {withIcon && (
          <Icon
            color={withIcon.color}
            size={withIcon.size}
            name={withIcon.name}
          />
        )}
      </View>
      {valueOnNewLine ? (
        <View style={styles.valueOnNewLineContainer}>{ValueComponent}</View>
      ) : null}
    </>
  );
};

export default InfoRow;
