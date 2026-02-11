import React from 'react';
import { FlatList, View } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { Box } from '../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../UI/Box/box.types';
import { IconName as IconNameLibrary } from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import { ManualBackUpStepsSelectorsIDs } from '../../ManualBackupStep1/ManualBackUpSteps.testIds';
import { RevealSeedViewSelectorsIDs } from '../RevealSeedView.testIds';
import { SeedPhraseDisplayProps } from '../types';

const SeedPhraseDisplay = ({
  words,
  clipboardEnabled,
  onCopyToClipboard,
  styles,
}: SeedPhraseDisplayProps) => (
  <Box
    style={styles.seedPhraseListContainer}
    flexDirection={FlexDirection.Column}
    alignItems={AlignItems.center}
    justifyContent={JustifyContent.center}
    gap={12}
  >
    <View style={styles.seedPhraseContainer}>
      <FlatList
        data={words}
        numColumns={3}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={[styles.inputContainer]}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {index + 1}.
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
              key={index}
              ellipsizeMode="tail"
              numberOfLines={1}
              style={styles.word}
              testID={`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-${index}`}
              adjustsFontSizeToFit
              allowFontScaling
              minimumFontScale={0.1}
              maxFontSizeMultiplier={0}
            >
              {item}
            </Text>
          </View>
        )}
      />
    </View>
    {clipboardEnabled ? (
      <Button
        label={strings('reveal_credential.copy_to_clipboard')}
        variant={ButtonVariants.Link}
        size={ButtonSize.Sm}
        onPress={onCopyToClipboard}
        testID={
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON
        }
        style={styles.clipboardButton}
        startIconName={IconNameLibrary.Copy}
      />
    ) : null}
  </Box>
);

export default SeedPhraseDisplay;
