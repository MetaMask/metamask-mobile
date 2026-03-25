import React from 'react';
import { FlatList } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  TextButton,
  TextButtonSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  BoxBorderColor,
  BoxBackgroundColor,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { ManualBackUpStepsSelectorsIDs } from '../../ManualBackupStep1/ManualBackUpSteps.testIds';
import { RevealSeedViewSelectorsIDs } from '../RevealSeedView.testIds';
import { SeedPhraseDisplayProps } from '../types';

const SeedPhraseDisplay = ({
  words,
  showSeedPhrase,
  clipboardEnabled,
  onCopyToClipboard,
}: SeedPhraseDisplayProps) => (
  <Box
    twClassName="flex-1 w-full h-full gap-y-4"
    flexDirection={BoxFlexDirection.Column}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
  >
    <Box twClassName="min-h-[200px] flex-1 w-full h-full">
      <FlatList
        data={words}
        numColumns={3}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            borderWidth={1}
            borderColor={BoxBorderColor.BorderMuted}
            paddingHorizontal={2}
            paddingVertical={1}
            backgroundColor={BoxBackgroundColor.BackgroundMuted}
            margin={1}
            twClassName="flex-1 rounded-lg h-10 gap-x-1.5"
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              maxFontSizeMultiplier={1}
            >
              {index + 1}.
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              key={index}
              ellipsizeMode="tail"
              numberOfLines={1}
              maxFontSizeMultiplier={1}
              twClassName="flex-1"
              testID={`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-${index}`}
            >
              {item}
            </Text>
          </Box>
        )}
      />
    </Box>
    {clipboardEnabled ? (
      <TextButton
        size={TextButtonSize.BodyMd}
        onPress={onCopyToClipboard}
        testID={
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON
        }
        twClassName="self-center w-full flex-1 items-center justify-center mb-2"
        startIconName={IconName.Copy}
        startIconProps={{
          size: IconSize.Md,
        }}
        isDisabled={!showSeedPhrase}
      >
        {strings('reveal_credential.copy_to_clipboard')}
      </TextButton>
    ) : null}
  </Box>
);

export default SeedPhraseDisplay;
