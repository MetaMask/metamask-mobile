import React from 'react';
import {
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface EarnNoFeeTagProps {
  testID?: string;
}

const EarnNoFeeTag = ({ testID }: EarnNoFeeTagProps) => (
  <Tag severity={TagSeverity.Info} testID={testID}>
    <Text variant={TextVariant.BodyXs} color={TextColor.PrimaryDefault}>
      {strings('money.potential_earnings.no_fee')}
    </Text>
  </Tag>
);

export default EarnNoFeeTag;
