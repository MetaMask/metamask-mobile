import React from 'react';
import { View } from 'react-native';

import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { useSendContext } from '../../../context/send-context';
import { useSendScreenNavigation } from '../../../hooks/send/useSendScreenNavigation';
import { styleSheet } from './asset.styles';

export const Asset = () => {
  const { gotToSendScreen } = useSendScreenNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { asset } = useSendContext();

  return (
    <View style={styles.container}>
      <Text>Asset: {asset?.address ?? 'NA'}</Text>
      <Button
        label="Continue"
        disabled={!asset}
        onPress={gotToSendScreen}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
      />
    </View>
  );
};
