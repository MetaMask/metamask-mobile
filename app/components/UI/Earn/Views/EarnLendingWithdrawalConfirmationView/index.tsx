import React, { useEffect } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { getStakingNavbar } from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import styleSheet from './EarnLendingWithdrawalConfirmationView.styles';
import { useStyles } from '../../../../hooks/useStyles';

const EarnLendingWithdrawalConfirmationView = () => {
  const { styles, theme } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(strings('earn.deposit'), navigation, theme.colors, {
        hasCancelButton: false,
        backgroundColor: theme.colors.background.alternative,
      }),
    );
  }, [navigation, theme.colors]);

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.HeadingSM}>
        Lending Withdrawal Screen Placeholder
      </Text>
    </View>
  );
};

export default EarnLendingWithdrawalConfirmationView;
