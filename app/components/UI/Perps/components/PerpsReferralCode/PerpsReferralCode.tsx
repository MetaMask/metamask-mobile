import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import PenguinCharacter from '../../../../../images/penguin.svg';
import styleSheet from './PerpsReferralCode.styles';

interface PerpsReferralCodeProps {
  referralCode: string;
}

const PerpsReferralCode: React.FC<PerpsReferralCodeProps> = ({
  referralCode,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <PenguinCharacter name="penguin" height={24} width={24} />
      </View>
      <Text style={styles.referralText} variant={TextVariant.BodyMDMedium}>
        {referralCode}
      </Text>
    </View>
  );
};

export default PerpsReferralCode;
