import React from 'react';
import { SeedPhraseGrid } from './SeedPhraseGrid';

interface SeedPhraseRevealProps {
  seedPhrase: string[];
}

export const SeedPhraseReveal = ({ seedPhrase }: SeedPhraseRevealProps) => {
  return (
    <SeedPhraseGrid
      seedPhrase={seedPhrase}
      setSeedPhrase={() => {}}
      isEditable={false}
      canShowSeedPhraseWord={() => true}
      hideSeedPhraseInput={false}
      showAllSeedPhrase={true}
    />
  );
};
