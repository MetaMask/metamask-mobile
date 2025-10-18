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
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import styleSheet from './PredictPositionEmpty.styles';

interface PredictPositionEmptyProps {}

const PredictPositionEmpty: React.FC<PredictPositionEmptyProps> = () => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box style={styles.emptyState}>
      <Icon
        name={IconName.Details}
        size={IconSize.XXL}
        color={IconColor.Muted}
        style={styles.emptyStateIcon}
      />
      <Text variant={TextVariant.HeadingMd} style={styles.emptyStateTitle}>
        {strings('predict.tab.no_predictions')}
      </Text>
      <Text variant={TextVariant.BodyMd} style={styles.emptyStateDescription}>
        {strings('predict.tab.no_predictions_description')}
      </Text>
      <Button
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
        onPress={() =>
          navigation.navigate(Routes.WALLET.HOME, {
            screen: Routes.WALLET.TAB_STACK_FLOW,
            params: {
              screen: Routes.PREDICT.ROOT,
              params: {
                screen: Routes.PREDICT.MARKET_LIST,
              },
            },
          })
        }
        label={strings('predict.tab.explore')}
        style={styles.exploreMarketsButton}
      />
    </Box>
  );
};

export default PredictPositionEmpty;
