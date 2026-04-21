import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import Logger from '../../../../util/Logger';
import HardwareWalletRive from '../../../../animations/hardware_wallet.riv';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
  riveContainer: {
    width: 280,
    height: 280,
  },
  rive: {
    width: '100%',
    height: '100%',
  },
});

const SearchingForDevice = () => {
  const tw = useTailwind();
  const riveRef = useRef<RiveRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fireResetState = useCallback(() => {
    if (riveRef.current) {
      try {
        riveRef.current.fireState('Ledger_states', 'reset');
      } catch (error) {
        Logger.error(
          error as Error,
          'Error triggering Ledger searching Rive animation',
        );
      }
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      fireResetState();
    }
  }, [isPlaying, fireResetState]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="flex-1 bg-default"
      >
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 px-4"
        >
          <View style={styles.riveContainer}>
            <Rive
              ref={riveRef}
              style={styles.rive}
              source={HardwareWalletRive}
              fit={Fit.Contain}
              alignment={Alignment.Center}
              artboardName="Ledger_states"
              stateMachineName="Ledger_states"
              testID="ledger-searching-animation"
              onPlay={() => {
                setIsPlaying(true);
              }}
            />
          </View>
        </Box>

        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="w-full px-4 pb-10"
          testID="hardware-wallet-searching-content"
        >
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            {strings('ledger.looking_for_device')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.PrimaryAlternative}
            twClassName="pt-2 text-center"
          >
            {strings('ledger.wait_while_we_search_for_it')}
          </Text>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default SearchingForDevice;
