import React from 'react';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './PerpsTutorialCard.styles';
import {
  Icon,
  IconSize,
  IconColor,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import TempTouchableOpacity from '../../../../../component-library/components-temp/TempTouchableOpacity';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsTutorialSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { strings } from '../../../../../../locales/i18n';

const PerpsTutorialCard = () => {
  const { styles } = useStyles(styleSheet, {});

  const { navigate } = useNavigation();

  const handlePress = () => {
    navigate(Routes.PERPS.TUTORIAL);
  };

  return (
    <TempTouchableOpacity
      style={styles.container}
      onPress={handlePress}
      testID={PerpsTutorialSelectorsIDs.TUTORIAL_CARD}
    >
      <Text variant={TextVariant.BodyMd}>
        {strings('perps.tutorial.card.title')}
      </Text>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Md}
        color={IconColor.IconDefault}
      />
    </TempTouchableOpacity>
  );
};

export default PerpsTutorialCard;
