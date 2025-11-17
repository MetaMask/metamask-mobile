import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import styleSheet from './PredictPositionEmpty.styles';
import PredictionsDark from '../../../../../images/predictions-dark.svg';
import PredictionsLight from '../../../../../images/predictions-light.svg';
import { useAssetFromTheme } from '../../../../../util/theme';
import { PredictEventValues } from '../../constants/eventNames';

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
      <ThemedPredictions
        testID="icon"
        width={72}
        height={72}
        style={styles.emptyStateIcon}
      />
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-alternative"
        style={styles.emptyStateDescription}
      >
        {strings('predict.tab.no_predictions_description')}
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        onPress={() =>
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MARKET_LIST,
            params: {
              entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
            },
          })
        }
        label={strings('predict.tab.explore')}
        style={styles.emptyStateButton}
      />
    </Box>
  );
};

export default PredictPositionEmpty;
