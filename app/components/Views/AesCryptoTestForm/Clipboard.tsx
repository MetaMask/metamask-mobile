import React, { useCallback } from 'react';

import ClipboardManager from '../../../core/ClipboardManager';
import Pressable from '../../../component-library/components-temp/Pressable';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const ClipboardText = ({
  text,
  testID,
  styles,
}: {
  text: string;
  testID: string;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
}) => {
  const copy = useCallback(async () => {
    await ClipboardManager.setString(text);
  }, [text]);

  return (
    <Pressable onPress={copy} style={styles.clipboardText} testID={testID}>
      <Text variant={TextVariant.BodyMD}>{text}</Text>
    </Pressable>
  );
};

export default ClipboardText;
