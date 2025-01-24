import React from 'react';
import { View } from 'react-native-reanimated/lib/typescript/Animated';
import Icon, { IconName, IconSize } from '../../../../../../component-library/components/Icons/Icon';
import Text, { TextColor, TextVariant } from '../../../../../../component-library/components/Texts/Text';
import { IconSizes } from '../../../../../../component-library/components-temp/KeyValueRow';
import { TouchableOpacity } from 'react-native';

export enum Severity {
    Danger = 'danger',
    Warning = 'warning',
    Info = 'info',
    Success = 'success',
  }

export interface InlineAlertProps {
    /** The onClick handler for the inline alerts */
    onClick?: () => void;
    /** The severity of the alert, e.g. Severity.Warning */
    severity?: Severity;
    /** Additional styles to apply to the inline alert */
    style?: React.CSSProperties;
}

export default function InlineAlert({
  onClick,
  severity = Severity.Info,
  style,
}: InlineAlertProps) {
//   const t = useI18nContext();

  return (
    <View>
      <TouchableOpacity
        data-testid="inline-alert"
        // backgroundColor={getSeverityBackground(severity)}
        // borderRadius={BorderRadius.SM}
        // gap={1}
        // display={Display.InlineFlex}
        // alignItems={AlignItems.center}
        // className={classnames({
        //   'inline-alert': true,
        //   'inline-alert__info': severity === Severity.Info,
        //   'inline-alert__warning': severity === Severity.Warning,
        //   'inline-alert__danger': severity === Severity.Danger,
        // })}
        // style={style}
        onPress={onClick}
      >
        <Icon
          name={IconName.Danger}
          size={IconSize.Sm}
        />
        <Text variant={TextVariant.BodySM} color={TextColor.Info}>
          {'Alert'}
        </Text>
        <Icon name={IconName.ArrowRight} size={IconSizes.Xs} />
      </TouchableOpacity>
    </View>
  );
}
