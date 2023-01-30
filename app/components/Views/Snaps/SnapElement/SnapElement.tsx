import React, { useState } from 'react';
import { View, TextInput } from 'react-native';

import Engine from '../../../../core/Engine';
import { useTheme } from '../../../../util/theme';
import Text from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';

import { createStyles } from './styles';

const SnapElement = (snap: any) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [input, setInput] = useState<string>('');

  const ping = async () => {
    // eslint-disable-next-line no-console
    console.log('ping');
  };

  const terminate = async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.terminateSnap(snap.snap.id);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const executeSnapMethod = async (): Promise<any> => {
    // eslint-disable-next-line no-console
    const { SnapController } = Engine.context as any;
    const localSnap = snap.snap.id;
    const origin = 'metamask-mobile';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const { name, args } = JSON.parse(input);
    const result = await SnapController.handleRequest({
      snapId: localSnap,
      origin,
      handler: 'onRpcRequest',
      request: {
        method: input.toLowerCase(),
      },
    });
    // eslint-disable-next-line no-console
    console.log(result);
    // await SnapController.terminateSnap(snapId);
  };

  return (
    <View style={styles.snapElementContainer}>
      <Text>{`Snap: ${snap.snap.id}`}</Text>
      <Text>{`Status: ${snap.snap.status}`}</Text>
      <View style={styles.btnContainer}>
        <Button
          label={'Ping'}
          onPress={ping}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          style={styles.button}
        />
        <Button
          label={'Terminate'}
          onPress={terminate}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          style={styles.button}
        />
      </View>
      <TextInput
        style={styles.input}
        onChangeText={setInput}
        value={input}
        placeholder={'method name'}
      />
      <Button
        label={'Execute Snap Method'}
        // eslint-disable-next-line no-console
        onPress={executeSnapMethod}
        variant={ButtonVariants.Tertiary}
        size={ButtonSize.Sm}
        style={styles.installBtn}
      />
    </View>
  );
};

export default SnapElement;
