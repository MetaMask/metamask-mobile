import React, { useRef, useState } from 'react';
import { Image } from 'react-native';
import {
  Box,
  ButtonBase,
  ButtonBaseSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import CollectiblesMotion from '../CollectiblesMotion/CollectiblesMotion';
import { PackRevealSelectorsIDs as IDs } from './PackReveal.testIds';
import type { PackRevealProps } from './PackReveal.types';

/** All packs are already open before this isolated presentation starts. Skip never writes. */
export default function PackReveal({
  name,
  initiallyRevealed = false,
  current = 1,
  total = 1,
  image,
  previewImage,
  backImage,
  packCode,
  year,
  gradingCompany,
  grade,
  rarity,
  isActive = true,
  onRevealed,
  children,
}: PackRevealProps) {
  const { online, network } = useCollectiblesPresentation();
  const [revealed, setRevealed] = useState(initiallyRevealed);
  const completed = useRef(initiallyRevealed);
  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    setRevealed(true);
    onRevealed();
  };
  const artwork = getCollectiblesPackArtwork(`pack_partner:${packCode ?? ''}`);
  const front =
    network === 'SLOW_CELLULAR'
      ? (previewImage ?? image)
      : (image ?? previewImage);
  return (
    <Box twClassName="flex-1 bg-default" testID={IDs.CONTAINER}>
      {revealed ? (
        <Box twClassName="flex-1" testID={IDs.CARD}>
          {children}
        </Box>
      ) : (
        <>
          <Box twClassName="flex-row items-center justify-between px-5">
            <Text variant={TextVariant.BodySm}>
              {strings('collectibles.reveal.pack_count', { current, total })}
            </Text>
            <ButtonBase
              size={ButtonBaseSize.Sm}
              onPress={finish}
              isDisabled={!isActive}
              testID={IDs.REVEAL_BUTTON}
            >
              {strings('collectibles.reveal.skip')}
            </ButtonBase>
          </Box>
          {online && front ? (
            <CollectiblesMotion
              configuration={{
                kind: 'reveal',
                identity: `${packCode}:${front}`,
                name,
                front,
                back: backImage,
                packArt: Image.resolveAssetSource(artwork.image)?.uri,
                year,
                grader: gradingCompany,
                grade,
                rarity,
                slashLabel: strings('collectibles.reveal.slash'),
              }}
              isActive={isActive}
              onRevealed={finish}
              onError={finish}
              testID="collectibles-reveal-web"
            />
          ) : (
            <Box twClassName="flex-1 items-center justify-center">
              <ButtonBase onPress={finish}>
                {strings('collectibles.reveal.your_card')}
              </ButtonBase>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
