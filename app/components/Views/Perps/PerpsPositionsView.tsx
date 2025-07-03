import React, { useState } from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import ScreenView from '../../Base/ScreenView';
import Logger from '../../../util/Logger';

interface PerpsPositionsViewProps {}

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
  buttonContainer: {
    marginBottom: 32,
  },
  button: {
    marginBottom: 16,
  },
});

const PerpsPositionsView: React.FC<PerpsPositionsViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const [isLoading, setIsLoading] = useState(false);

  const handleButtonPress = async () => {
    setIsLoading(true);
    Logger.log('PerpsPositionsView: Button pressed');

    // Simulate some async operation
    setTimeout(() => {
      setIsLoading(false);
      Logger.log('PerpsPositionsView: Operation completed');
    }, 1000);
  };

  return (
    <ScreenView>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
            Perps Positions
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            Manage your trading positions
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="View Positions"
            onPress={handleButtonPress}
            loading={isLoading}
            style={styles.button}
          />
        </View>
      </View>
    </ScreenView>
  );
};

export default PerpsPositionsView;
