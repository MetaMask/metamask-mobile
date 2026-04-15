import React, { FunctionComponent, ReactNode, useState } from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { Box } from '../../UI/Box/Box';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../hooks/useStyles';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { stylesheet } from './SnapUICollapsibleSection.styles';
import { useTheme } from '../../../util/theme';

interface SnapUICollapsibleSectionProps {
  label: string;
  isLoading?: boolean;
  isExpanded?: boolean;
  backgroundColor?: string;
  children: ReactNode;
}

export const SnapUICollapsibleSection: FunctionComponent<
  SnapUICollapsibleSectionProps
> = ({
  label,
  isLoading,
  isExpanded: isExpandedProp = false,
  children,
  backgroundColor,
  ...props
}) => {
  const theme = useTheme();
  const { styles } = useStyles(stylesheet, {});
  const [isExpanded, setIsExpanded] = useState(isExpandedProp);

  const handleToggle = () => {
    setIsExpanded((state) => !state);
  };

  const iconName = isExpanded ? IconName.ArrowUp : IconName.ArrowDown;

  return (
    <Box
      testID="snaps-ui-collapsible-section"
      gap={8}
      padding={16}
      borderRadius={8}
      backgroundColor={backgroundColor}
    >
      <TouchableOpacity
        disabled={isLoading}
        onPress={handleToggle}
        style={styles.header}
      >
        <Text>{label}</Text>
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary.default}
          />
        )}
        {!isLoading && (
          <Icon
            size={IconSize.Sm}
            color={IconColor.PrimaryDefault}
            name={iconName}
          />
        )}
      </TouchableOpacity>
      {isExpanded && !isLoading && <Box {...props}>{children}</Box>}
    </Box>
  );
};
