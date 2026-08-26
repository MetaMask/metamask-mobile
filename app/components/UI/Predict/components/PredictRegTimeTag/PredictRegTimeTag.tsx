import React from 'react';
import { Pressable } from 'react-native';
import {
  IconColor,
  IconName,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface PredictRegTimeTagProps {
  onPress?: () => void;
  testID?: string;
  buttonTestID?: string;
}

export const PREDICT_REG_TIME_TAG_TEST_IDS = {
  TAG: 'predict-reg-time-tag',
  INFO_BUTTON: 'predict-reg-time-info-button',
} as const;

const PredictRegTimeTag: React.FC<PredictRegTimeTagProps> = ({
  onPress,
  testID = PREDICT_REG_TIME_TAG_TEST_IDS.TAG,
  buttonTestID = PREDICT_REG_TIME_TAG_TEST_IDS.INFO_BUTTON,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={strings('predict.reg_time_info.accessibility_label')}
    testID={buttonTestID}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Tag
      severity={TagSeverity.Neutral}
      endIconName={IconName.Info}
      endIconProps={{
        color: IconColor.IconAlternative,
      }}
      testID={testID}
    >
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {strings('predict.reg_time_info.tag')}
      </Text>
    </Tag>
  </Pressable>
);

export default PredictRegTimeTag;
