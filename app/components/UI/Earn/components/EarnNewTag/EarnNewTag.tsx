import React from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface EarnNewTagProps {
  testID?: string;
}

const EarnNewTag = ({ testID }: EarnNewTagProps) => (
  <Tag
    severity={TagSeverity.Info}
    startAccessory={
      <Icon
        name={IconName.Sparkle}
        color={IconColor.PrimaryDefault}
        size={IconSize.Xs}
      />
    }
    testID={testID}
  >
    <Text variant={TextVariant.BodyXs} color={TextColor.PrimaryDefault}>
      {strings('earn_module.new_tag')}
    </Text>
  </Tag>
);

export default EarnNewTag;
