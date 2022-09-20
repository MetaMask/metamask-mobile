/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../hooks';
import Icon, { IconSize, IconName } from '../../../Icon';
import Text, { TextVariant } from '../../../Text';

// Internal dependencies.
import styleSheet from './AccordionHeader.styles';
import { AccordionHeaderProps } from './AccordionHeader.types';

const AccordionHeader: React.FC<AccordionHeaderProps> = ({
  style,
  title,
  isExpanded = false,
  onPress,
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const getArrowIcon = () =>
    isExpanded ? IconName.ArrowUpOutline : IconName.ArrowDownOutline;

  return (
    <TouchableOpacity activeOpacity={0.5} onPress={onPress} style={styles.base}>
      <Text variant={TextVariant.sBodyMD} style={styles.title}>
        {title}
      </Text>
      <Icon
        name={getArrowIcon()}
        size={IconSize.Sm}
        color={styles.title.color}
        style={styles.arrowDownIcon}
      />
    </TouchableOpacity>
  );
};

export default AccordionHeader;
