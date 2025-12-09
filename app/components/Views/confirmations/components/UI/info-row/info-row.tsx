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
import { Skeleton } from '../../../../../../component-library/components/Skeleton';

export enum InfoRowVariant {
  Default = 'default',
  Small = 'small',
}

export interface InfoRowProps {
  label?: string;
  children?: ReactNode | string;
  onTooltipPress?: () => void;
  onLabelClick?: () => void;
  tooltip?: ReactNode;
  tooltipTitle?: string;
  tooltipColor?: IconColor;
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
  rowVariant?: InfoRowVariant;
}

const InfoRow = ({
  label,
  children,
  onTooltipPress,
  onLabelClick,
  style = {},
  labelChildren = null,
  tooltip,
  tooltipTitle,
  tooltipColor,
  testID,
  variant = TextColor.Alternative,
  copyText,
  valueOnNewLine = false,
  withIcon,
  rowVariant = InfoRowVariant.Default,
}: InfoRowProps) => {
  const { styles } = useStyles(styleSheet, { variant: rowVariant });
  const hasLabel = Boolean(label);

  const ValueComponent =
    typeof children === 'string' ? (
      <Text style={styles.value}>{children}</Text>
    ) : (
      <>{children}</>
    );

  const labelVariant =
    rowVariant === InfoRowVariant.Small
      ? TextVariant.BodyMD
      : TextVariant.BodyMDMedium;

  return (
    <>
      <View
        style={{ ...styles.container, ...style }}
        testID={testID ?? 'info-row'}
      >
        {Boolean(label) && (
          <View style={styles.labelContainer}>
            <Text variant={labelVariant} color={variant} onPress={onLabelClick}>
              {label}
            </Text>
            {labelChildren}
            {!labelChildren && tooltip && (
              <Tooltip
                content={tooltip}
                onPress={onTooltipPress}
                title={tooltipTitle ?? label}
                iconColor={tooltipColor}
              />
            )}
          </View>
        )}
        {!hasLabel && labelChildren && (
          <View
            style={{
              ...styles.labelContainer,
              ...styles.labelContainerWithoutLabel,
            }}
          >
            {labelChildren}
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

export const InfoRowSkeleton: React.FC<{ testId?: string }> = ({ testId }) => (
  <InfoRow
    testID={testId}
    rowVariant={InfoRowVariant.Small}
    labelChildren={<Skeleton width={100} height={20} />}
  >
    <Skeleton width={80} height={20} />
  </InfoRow>
);

export default InfoRow;
