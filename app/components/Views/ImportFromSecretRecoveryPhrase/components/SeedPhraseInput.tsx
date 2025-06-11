import React, { forwardRef } from 'react';
import {
  TextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { ImportFromSeedSelectorsIDs } from '../../../../../e2e/selectors/Onboarding/ImportFromSeed.selectors';
import createStyles from '../styles';

interface SeedPhraseInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onKeyPress: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  testID?: string;
}

const SeedPhraseInput = forwardRef<TextInput, SeedPhraseInputProps>(
  ({ value, onChangeText, onKeyPress, testID }, ref) => {
    const { colors } = useTheme();
    const styles = createStyles(colors);

    return (
      <TextInput
        ref={ref}
        textAlignVertical="top"
        placeholder={strings('import_from_seed.srp_placeholder')}
        value={value}
        onChangeText={onChangeText}
        style={styles.seedPhraseDefaultInput}
        placeholderTextColor={colors.text.alternative}
        multiline
        autoFocus
        onKeyPress={onKeyPress}
        autoComplete="off"
        blurOnSubmit={false}
        autoCapitalize="none"
        testID={testID || ImportFromSeedSelectorsIDs.SEED_PHRASE_INPUT_ID}
      />
    );
  },
);

SeedPhraseInput.displayName = 'SeedPhraseInput';

export default SeedPhraseInput;
