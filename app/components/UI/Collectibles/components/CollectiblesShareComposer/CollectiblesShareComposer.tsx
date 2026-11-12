import React, { useRef, useState } from 'react';
import { FlatList, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import { showSuccessToast } from '../../hooks/toasts';
import type { CollectiblesCardShareSnapshot } from '../../services/clients/CollectiblesSocialApiClient';
import CardImage from '../CardImage';
import { useCollectiblesShareCards } from '../../hooks/useCollectiblesSocialCommands';
import { CollectiblesShareComposerTestIds } from '../../Collectibles.testIds';

/** Share card snapshots through the Social API. */
export default function CollectiblesShareComposer({
  cards,
  onClose,
}: {
  cards: CollectiblesCardShareSnapshot[];
  onClose: () => void;
}) {
  const tw = useTailwind();
  const share = useCollectiblesShareCards();
  const { online } = useCollectiblesPresentation();
  const [caption, setCaption] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  const [draftId] = useState(
    () =>
      `collectibles-post-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const close = () => {
    if (!inFlight.current) onClose();
  };
  const publish = async () => {
    if (inFlight.current || !share.enabled) return;
    inFlight.current = true;
    setPending(true);
    setError(false);
    try {
      await share.mutateAsync({
        draftId,
        cards,
        caption,
      });
      showSuccessToast(strings('collectibles.social_preview.published'));
      onClose();
    } catch {
      setError(true);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <ModalSafeAreaProvider>
        <SafeAreaView
          style={tw.style('flex-1 bg-default')}
          edges={['bottom', 'left', 'right']}
          testID={CollectiblesShareComposerTestIds.CONTAINER}
        >
          <HeaderStandard
            includesTopInset
            title={strings('collectibles.social_preview.title')}
            onClose={pending ? undefined : close}
            closeButtonProps={{
              accessibilityLabel: strings('collectibles.reveal.close'),
            }}
          />
          <FlatList
            data={cards}
            keyExtractor={(card) => card.mint}
            contentContainerStyle={tw.style('p-4 gap-4')}
            ListHeaderComponent={
              <Box gap={4}>
                <TextInput
                  accessibilityLabel={strings(
                    'collectibles.social_preview.caption',
                  )}
                  placeholder={strings('collectibles.social_preview.caption')}
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={500}
                  multiline
                  editable={!pending}
                  style={tw.style(
                    'text-default border border-muted rounded-xl p-4 min-h-24',
                  )}
                  testID={CollectiblesShareComposerTestIds.CAPTION}
                />
              </Box>
            }
            renderItem={({ item }) => (
              <Box twClassName="flex-row items-center rounded-xl bg-muted p-3 gap-4">
                <Box twClassName="w-16" style={{ aspectRatio: 5 / 8 }}>
                  <CardImage
                    uri={online ? (item.imageUrl ?? undefined) : undefined}
                    accessibilityLabel={item.name}
                  />
                </Box>
                <Text twClassName="flex-1">{item.name}</Text>
              </Box>
            )}
          />
          <Box twClassName="p-4 gap-3">
            {error && (
              <Text color={TextColor.ErrorDefault}>
                {strings('collectibles.card.share_error')}
              </Text>
            )}
            <Button
              variant={ButtonVariant.Primary}
              isFullWidth
              isLoading={pending}
              isDisabled={!share.enabled || pending}
              onPress={publish}
              testID={CollectiblesShareComposerTestIds.PUBLISH}
            >
              {strings('collectibles.social_preview.publish')}
            </Button>
          </Box>
        </SafeAreaView>
      </ModalSafeAreaProvider>
    </Modal>
  );
}
