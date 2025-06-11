import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import createStyles from '../styles';

interface SeedPhraseActionsProps {
  seedPhraseLength: number;
  showAllSeedPhrase: boolean;
  onToggleShowAll: () => void;
  onClearOrPaste: () => void;
}

const SeedPhraseActions: React.FC<SeedPhraseActionsProps> = ({
  seedPhraseLength,
  showAllSeedPhrase,
  onToggleShowAll,
  onClearOrPaste,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.seedPhraseContainerCta}>
      <Button
        variant={ButtonVariants.Link}
        style={styles.pasteButton}
        onPress={onToggleShowAll}
        label={
          showAllSeedPhrase
            ? strings('import_from_seed.hide_all')
            : strings('import_from_seed.show_all')
        }
        width={ButtonWidthTypes.Full}
      />
      <Button
        label={
          seedPhraseLength > 1
            ? strings('import_from_seed.clear_all')
            : strings('import_from_seed.paste')
        }
        variant={ButtonVariants.Link}
        style={styles.pasteButton}
        onPress={onClearOrPaste}
        width={ButtonWidthTypes.Full}
      />
    </View>
  );
};

export default SeedPhraseActions;
