import { Box } from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { TabEmptyState } from '../../../../../component-library/components-temp/TabEmptyState';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import PredictionsDark from '../../../../../images/predictions-dark.svg';
import PredictionsLight from '../../../../../images/predictions-light.svg';
import { useAssetFromTheme } from '../../../../../util/theme';
import { PredictEventValues } from '../../constants/eventNames';
import styleSheet from './PredictPositionEmpty.styles';

interface PredictPositionEmptyProps {}

const PredictPositionEmpty: React.FC<PredictPositionEmptyProps> = () => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const ThemedPredictions = useAssetFromTheme(
    PredictionsLight,
    PredictionsDark,
  );

  return (
    <Box testID="predict-position-empty" style={styles.emptyState}>
      <TabEmptyState
        icon={<ThemedPredictions testID="icon" width={72} height={72} />}
        description={strings('predict.tab.no_predictions_description')}
        actionButtonText={strings('predict.tab.explore')}
        onAction={() =>
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MARKET_LIST,
            params: {
              entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
            },
          })
        }
      />
    </Box>
  );
};

export default PredictPositionEmpty;
