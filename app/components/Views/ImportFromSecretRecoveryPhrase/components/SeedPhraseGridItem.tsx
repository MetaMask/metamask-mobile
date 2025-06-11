import React, { forwardRef } from 'react';
import {
  View,
  TextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useTheme } from '../../../../util/theme';
import TextField from '../../../../component-library/components/Form/TextField/TextField';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { TextFieldSize } from '../../../../component-library/components/Form/TextField';
import { ImportFromSeedSelectorsIDs } from '../../../../../e2e/selectors/Onboarding/ImportFromSeed.selectors';
import createStyles from '../styles';

interface SeedPhraseGridItemProps {
  index: number;
  value: string;
  width: number;
  isSecure: boolean;
  isError: boolean;
  isAutoFocus: boolean;
  onFocus: (index: number) => void;
  onChangeText: (text: string, index: number) => void;
  onKeyPress: (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => void;
  testID?: string;
}

const SeedPhraseGridItem = forwardRef<TextInput, SeedPhraseGridItemProps>(
  (
    {
      index,
      value,
      width,
      isSecure,
      isError,
      isAutoFocus,
      onFocus,
      onChangeText,
      onKeyPress,
      testID,
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const handleFocus = (e: any) => {
      if (e?.target && e?.currentTarget?.setNativeProps) {
        const target = e.target as { value?: string };
        e?.currentTarget?.setNativeProps({
          selection: {
            start: target?.value?.length ?? 0,
            end: target?.value?.length ?? 0,
          },
        });
      }
      onFocus(index);
    };

    const handleSubmitEditing = () => {
      // Create a synthetic key press event for consistency
      const syntheticEvent = {
        nativeEvent: { key: 'Enter' },
      } as NativeSyntheticEvent<TextInputKeyPressEventData>;
      onKeyPress(syntheticEvent, index);
    };

    return (
      <View
        style={[
          {
            width,
          },
          styles.inputPadding,
        ]}
      >
        <TextField
          ref={ref}
          startAccessory={
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.inputIndex}
            >
              {index + 1}.
            </Text>
          }
          value={value}
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onChangeText={(text) => onChangeText(text, index)}
          placeholderTextColor={colors.text.muted}
          onSubmitEditing={handleSubmitEditing}
          onKeyPress={(e) => onKeyPress(e, index)}
          size={TextFieldSize.Md}
          style={[styles.input]}
          autoComplete="off"
          textAlignVertical="center"
          showSoftInputOnFocus
          isError={isError}
          autoCapitalize="none"
          numberOfLines={1}
          autoFocus={isAutoFocus}
          testID={`${
            testID || ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID
          }_${index}`}
        />
      </View>
    );
  },
);

SeedPhraseGridItem.displayName = 'SeedPhraseGridItem';

export default SeedPhraseGridItem;
