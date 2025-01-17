import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useStyles } from '../../../../../../../../../component-library/hooks';
import InfoRow from '../../../../../UI/InfoRow';
import InfoSection from '../../../../../UI/InfoRow/InfoSection';
import Loader from '../../../../../../../../../component-library/components-temp/Loader';

const styleSheet = () => StyleSheet.create({
  base: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  loaderContainer: {
    display: 'flex',
    justifyContent: 'center',
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
  const { styles } = useStyles(styleSheet, {});

  return(
    <View style={isCollapsed ? styles.base : {}}>
      <InfoSection>
        <InfoRow label={title} tooltip={titleTooltip}>
          {description}
        </InfoRow>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <Loader size={'small'} />
          </View>
        ) : (
          simulationElements
          )}
        </InfoSection>
    </View>
  );
};

export default StaticSimulation;
