import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useStyles } from '../../../../../../../../../component-library/hooks';
import InfoRow from '../../../../../UI/InfoRow';
import InfoSection from '../../../../../UI/InfoRow/InfoSection';

const styleSheet = () => StyleSheet.create({
  base: {
    display: 'flex',
    justifyContent: 'space-between',
  },
});

const StaticSimulation: React.FC<{
  title: string;
  titleTooltip: string;
  description?: string;
  simulationElements: React.ReactNode;
  isLoading?: boolean;
  isCollapsed?: boolean;
}> = ({
  title,
  titleTooltip,
  description,
  simulationElements,
  isLoading,
  isCollapsed = false,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});

  return(
    <View style={isCollapsed ? styles.base : {}}>
      <InfoSection>
        <InfoRow label={title} tooltip={titleTooltip}>
          {description}
        </InfoRow>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={theme.colors.warning.default}
          />
        ) : (
          simulationElements
          )}
        </InfoSection>
    </View>
  );
};

export default StaticSimulation;
