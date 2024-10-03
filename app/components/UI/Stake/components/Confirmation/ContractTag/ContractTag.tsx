import React from 'react';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../../component-library/base-components/TagBase';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../component-library/components/Texts/Text';
import { ContractTagProps } from './ContractTag.types';

const ContractTag = ({ name }: ContractTagProps) => (
  <TagBase
    startAccessory={<Icon name={IconName.Question} size={IconSize.Sm} />}
    shape={TagShape.Pill}
    severity={TagSeverity.Neutral}
  >
    <Text>{name}</Text>
  </TagBase>
);

export default ContractTag;
