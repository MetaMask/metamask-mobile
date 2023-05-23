import React, { useState } from 'react';
import { View, TextInput } from 'react-native';

import Engine from '../../../../core/Engine';
import { useTheme } from '../../../../util/theme';
import Text from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import Cell, {
  CellVariants,
} from '../../../../component-library/components/Cells/Cell';
import { AvatarVariants } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { Snap } from '@metamask/snaps-utils';

import { createStyles } from './styles';

const SnapElement = (snap: Snap) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  console.log(
    'snaps/ SnapElement.tsx: SnapElement: snap: ',
    JSON.stringify(snap, null, 2),
  );

  const [input, setInput] = useState<string>('');

  const ping = async () => {
    // eslint-disable-next-line no-console
    console.log('ping');
  };

  const stopSnap = async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.stopSnap(snap.id);
  };

  const removeSnap = async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.removeSnap(snap.id);
  };

  const executeSnapMethod = async (): Promise<any> => {
    const { SnapController } = Engine.context as any;
    const localSnap = snap.id;
    const origin = 'metamask-mobile';
    await SnapController.handleRequest({
      snapId: localSnap,
      origin,
      handler: 'onRpcRequest',
      request: {
        method: input.toLowerCase(),
      },
    });
  };

  return (
    <View style={styles.snapElementContainer}>
      {/* <Cell
        variant={CellVariants.Display}
        title={snap.id}
        avatarProps={{
          variant: AvatarVariants.Favicon,
          imageSource: snap.manifest.source.location.npm.iconPath,
        }}
      /> */}
      <Text>{`Snap: ${snap.id}`}</Text>
      <Text>{`Status: ${snap.status}`}</Text>
      <View style={styles.btnContainer}>
        <Button
          label={'Ping'}
          onPress={ping}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          style={styles.button}
        />
        <Button
          label={'Remove'}
          onPress={removeSnap}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          style={styles.button}
        />
        <Button
          label={'Stop'}
          onPress={stopSnap}
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
        onPress={executeSnapMethod}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Sm}
        style={styles.installBtn}
      />
    </View>
  );
};

export default SnapElement;
