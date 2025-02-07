// app/components/UI/Stake/components/EarnTokenSelector/index.tsx
import React from 'react';
import { useStyles } from '../../../../../component-library/hooks';
import { View } from 'react-native';
import styleSheet from './EarnTokenSelector.styles';
import { TokenI } from '../../../Tokens/types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import SelectButton, {
  SelectButtonSize,
} from '../../../../../component-library/components/Select/SelectButton';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

interface EarnTokenSelectorProps {
  token: TokenI;
  apr: string;
  balance?: string;
}

const EarnTokenSelector = ({ token, apr, balance }: EarnTokenSelectorProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.EARN_TOKEN_LIST,
    });
  };

  const renderStartAccessory = () => (
    <View style={styles.startAccessoryContainer}>
      <AvatarToken
        size={AvatarSize.Md}
        name={token.symbol}
        imageSource={{ uri: token.image }}
      />
    </View>
  );

  const renderEndAccessory = () => (
    <View style={styles.endAccessoryContainer}>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Success}
        style={styles.aprText}
      >
        {`${apr} APR`}
      </Text>
      {balance && (
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {`${balance} ${token.symbol}`}
        </Text>
      )}
    </View>
  );

  return (
    <SelectButton
      size={SelectButtonSize.Lg}
      style={styles.container}
      onPress={handlePress}
      startAccessory={renderStartAccessory()}
      endAccessory={renderEndAccessory()}
      testID="earn-token-selector"
    />
  );
};

export default EarnTokenSelector;
