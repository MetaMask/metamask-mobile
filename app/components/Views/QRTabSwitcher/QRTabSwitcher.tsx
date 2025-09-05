import { useNavigation } from '@react-navigation/native';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableWithoutFeedback } from 'react-native';
import QRScanner from '../QRScanner';
import { strings } from '../../../../locales/i18n';
import ReceiveRequest from '../../UI/ReceiveRequest';
import { useTheme } from '../../../util/theme';
import createStyles from './styles';
import NavbarTitle from '../../../components/UI/NavbarTitle';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import HeaderBase from '../../../component-library/components/HeaderBase';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { StackScreenProps } from '@react-navigation/stack';
import { RootParamList } from '../../../util/navigation/types';
import { QRTabSwitcherScreens } from './types';

const USER_CANCELLED = 'USER_CANCELLED';

type QRTabSwitcherProps = StackScreenProps<RootParamList, 'QRTabSwitcher'>;

const QRTabSwitcher = ({ route }: QRTabSwitcherProps) => {
  // Start tracing component loading
  const isFirstRender = useRef(true);

  if (isFirstRender.current) {
    trace({ name: TraceName.QRTabSwitcher });
  }

  const {
    onScanError,
    onScanSuccess = () => {},
    onStartScan,
    initialScreen,
    origin,
    disableTabber,
    networkName,
  } = route.params;

  const [selectedIndex, setSelectedIndex] = useState(
    initialScreen || QRTabSwitcherScreens.Scanner,
  );
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);

  const animatedValue = useRef(new Animated.Value(selectedIndex)).current;

  // End trace when component has finished initial loading
  useEffect(() => {
    endTrace({ name: TraceName.QRTabSwitcher });
    isFirstRender.current = false;
  }, []);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: selectedIndex,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, selectedIndex]);

  const interpolateLeft = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  const goBack = () => {
    navigation.goBack();
    try {
      onScanError?.(USER_CANCELLED);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn(`Error setting onScanError: ${error.message}`);
      } else {
        console.warn('An unknown error occurred');
      }
    }
  };

  return (
    <View style={styles.container}>
      {selectedIndex === QRTabSwitcherScreens.Scanner ? (
        <QRScanner
          onScanError={onScanError}
          onScanSuccess={onScanSuccess}
          onStartScan={onStartScan}
          origin={origin}
        />
      ) : null}

      {selectedIndex === QRTabSwitcherScreens.Receive ? (
        <ReceiveRequest
          navigation={navigation}
          hideModal={() => false}
          showReceiveModal
        />
      ) : null}

      <View style={styles.overlay}>
        <HeaderBase
          style={styles.header}
          endAccessory={
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSizes.Md}
              onPress={goBack}
            />
          }
        >
          {selectedIndex === QRTabSwitcherScreens.Receive ? (
            <NavbarTitle
              title={strings(`receive.title`)}
              translate={false}
              disableNetwork
              networkName={networkName}
            />
          ) : null}
        </HeaderBase>
      </View>

      {disableTabber ? null : (
        <View style={styles.segmentedControlContainer}>
          <Animated.View
            style={[
              styles.segmentedControlItemSelected,
              { left: interpolateLeft },
            ]}
          />
          <TouchableWithoutFeedback
            onPress={() => setSelectedIndex(QRTabSwitcherScreens.Scanner)}
          >
            <View style={styles.segmentedControlItem}>
              <Text
                style={
                  selectedIndex === QRTabSwitcherScreens.Scanner
                    ? styles.selectedText
                    : styles.text
                }
              >
                {strings(`qr_tab_switcher.scanner_tab`)}
              </Text>
            </View>
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback
            onPress={() => setSelectedIndex(QRTabSwitcherScreens.Receive)}
          >
            <View style={styles.segmentedControlItem}>
              <Text
                style={
                  selectedIndex === QRTabSwitcherScreens.Receive
                    ? styles.selectedText
                    : styles.text
                }
              >
                {strings(`qr_tab_switcher.receive_tab`)}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}
    </View>
  );
};

export default QRTabSwitcher;
