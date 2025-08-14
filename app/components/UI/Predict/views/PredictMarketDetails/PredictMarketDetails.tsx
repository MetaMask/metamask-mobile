import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import ScreenView from '../../../../Base/ScreenView';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { getNavigationOptionsTitle } from '../../../Navbar';
import { useTheme } from '../../../../../util/theme';

interface PredictMarketDetailsProps {}

const styleSheet = () => ({
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
    },
    headerContainer: {
      alignItems: 'center' as const,
      marginBottom: 32,
    },
  });

const PredictMarketDetails: React.FC<PredictMarketDetailsProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { colors } = useTheme();

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('predict.title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  return (
    <ScreenView>
      <View style={styles.content}>
        <Text variant={TextVariant.HeadingLG}>Market Detail</Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          Coming soon.
        </Text>
      </View>
    </ScreenView>
  );
};

export default PredictMarketDetails;
