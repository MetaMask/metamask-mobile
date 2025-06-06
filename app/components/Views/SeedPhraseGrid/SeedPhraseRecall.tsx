import React, { useState, useEffect } from 'react';
import { SeedPhraseGrid } from './SeedPhraseGrid';
import { View } from 'react-native';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';

interface SeedPhraseRevealProps {
  seedPhrase: string[];
}

const generateRandomNumbers = (
  min: number,
  max: number,
  count: number,
): number[] => {
  const numbers: number[] = [];
  for (let i = 0; i < count; i++) {
    numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return numbers;
};

export const SeedPhraseRecall = ({ seedPhrase }: SeedPhraseRevealProps) => {
  const [randomWordIndexes] = useState(
    generateRandomNumbers(0, seedPhrase.length, 3),
  );
  const [selectedWordOrder, setSelectedWordOrder] = useState<number[]>([]);
  const [disabledButtons, setDisabledButtons] = useState<Set<number>>(
    new Set(),
  );
  const [seedPhraseToShow, setSeedPhraseToShow] = useState(() =>
    seedPhrase.map((word, index) => {
      if (!randomWordIndexes.includes(index)) {
        return word;
      }
      return '';
    }),
  );

  const handleWordPress = (index: number) => {
    // Don't process if button is already disabled
    if (disabledButtons.has(index)) {
      return;
    }

    // Add the selected word to the order
    const newSelectedOrder = [...selectedWordOrder, index];
    setSelectedWordOrder(newSelectedOrder);

    // Disable the button
    setDisabledButtons((prev) => new Set([...prev, index]));

    // Update the seed phrase to show the selected word in its position
    setSeedPhraseToShow((prev) => {
      const newSeedPhrase = [...prev];
      newSeedPhrase[index] = seedPhrase[index];
      return newSeedPhrase;
    });

    // Check if the selection is in the correct order
    const sortedRandomIndexes = [...randomWordIndexes].sort((a, b) => a - b);
    const expectedIndex = sortedRandomIndexes[newSelectedOrder.length - 1];
    const isCorrect = index === expectedIndex;

    console.log(`Selected word at index ${index}: "${seedPhrase[index]}"`);
    console.log(`Expected index: ${expectedIndex}, Is correct: ${isCorrect}`);
    console.log(
      `Selection order so far:`,
      newSelectedOrder.map((i) => `${i}: "${seedPhrase[i]}"`),
    );
  };

  return (
    <View>
      <SeedPhraseGrid
        seedPhrase={seedPhraseToShow}
        setSeedPhrase={() => {}}
        isEditable={false}
        canShowSeedPhraseWord={(index) => randomWordIndexes.includes(index)}
        hideSeedPhraseInput={false}
        showAllSeedPhrase={false}
      />
      <View>
        {randomWordIndexes.map((index) => (
          <Button
            key={index}
            onPress={() => handleWordPress(index)}
            label={seedPhrase[index]}
            variant={ButtonVariants.Secondary}
            disabled={disabledButtons.has(index)}
          />
        ))}
      </View>
    </View>
  );
};
