import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import type { Theme } from '../../../../util/theme/models';
import ScreenView from '../../../Base/ScreenView';

interface PerpsPositionDetailsViewProps {}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    container: {
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.background.alternative,
      alignItems: 'center' as const,
    },
  };
};

const PerpsPositionDetailsView: React.FC<
  PerpsPositionDetailsViewProps
> = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <ScreenView>
      <View style={styles.content}>
        <View style={styles.container}>
          <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
            Position Details View
          </Text>
        </View>
      </View>
    </ScreenView>
  );
};

export default PerpsPositionDetailsView;
