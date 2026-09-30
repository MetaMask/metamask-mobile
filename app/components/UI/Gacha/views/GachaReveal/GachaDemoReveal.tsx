import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import type { RootState } from '../../../../../reducers';
import CardBackdrop from '../../components/CardBackdrop';
import { DEMO_ARTWORK_CODE } from '../../dev/revealDemo';
import { GachaRevealTestIds } from '../../Gacha.testIds';
import { COLLECTOR_CRYPT_RARITIES } from '../../providers/collector-crypt/constants';
import { useCollectorCryptAccount } from '../../providers/collector-crypt/hooks/useCollectorCryptAccount';
import { selectCollectorCryptCards } from '../../providers/collector-crypt/selectors/collectorCrypt';
import type { CollectorCryptRarity } from '../../providers/collector-crypt/types';
import GachaRevealContent from './GachaRevealContent';

/** Read-only local preview: no purchase, sale or operation controller is mounted. */
const GachaDemoReveal = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppStackNavigationProp>();
  const isFocused = useIsFocused();
  const account = useCollectorCryptAccount();
  const firstCard = useSelector(
    (state: RootState) => selectCollectorCryptCards(state, account?.address)[0],
  );
  const [rarity, setRarity] = useState<CollectorCryptRarity>('common');
  const [run, setRun] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const card = useMemo(
    () => (firstCard ? { ...firstCard, rarity } : undefined),
    [firstCard, rarity],
  );
  const handleRevealed = useCallback(() => setIsRevealed(true), []);
  const handleClose = useCallback(() => {
    navigation.popTo(Routes.GACHA.HOME, { initialTab: 'packs' });
  }, [navigation]);
  const replay = useCallback(() => {
    setIsRevealed(false);
    setRun((value) => value + 1);
  }, []);
  const selectRarity = useCallback(
    (value: string) => {
      const next = COLLECTOR_CRYPT_RARITIES.find((tier) => tier === value);
      if (next) {
        setRarity(next);
        replay();
      }
    },
    [replay],
  );

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={GachaRevealTestIds.CONTAINER}
    >
      <CardBackdrop variant="reveal" />
      <HeaderStandard
        includesTopInset
        title={strings('gacha.demo.title')}
        onClose={handleClose}
        closeButtonProps={{ testID: GachaRevealTestIds.CLOSE_BUTTON }}
      />
      <Box paddingHorizontal={4} paddingBottom={2} gap={2}>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={GachaRevealTestIds.DEMO_LABEL}
        >
          {strings('gacha.demo.description')}
        </Text>
        <FilterButtonGroup value={rarity} onChange={selectRarity}>
          {COLLECTOR_CRYPT_RARITIES.map((tier) => (
            <FilterButton
              key={tier}
              value={tier}
              size={FilterButtonSize.Sm}
              testID={GachaRevealTestIds.DEMO_RARITY(tier)}
            >
              {strings(`gacha.rarity.${tier}`)}
            </FilterButton>
          ))}
        </FilterButtonGroup>
      </Box>
      {card ? (
        <GachaRevealContent
          key={`${card.mint}-${run}`}
          card={card}
          packCode={DEMO_ARTWORK_CODE}
          packName={strings('gacha.demo.title')}
          isActive={isFocused}
          isRevealed={isRevealed}
          onRevealed={handleRevealed}
          footer={
            <>
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={replay}
                testID={GachaRevealTestIds.DEMO_SELL_AND_OPEN_BUTTON}
              >
                {strings('gacha.demo.sell_and_open')}
              </Button>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={replay}
                testID={GachaRevealTestIds.DEMO_REPLAY_BUTTON}
              >
                {strings('gacha.demo.replay')}
              </Button>
            </>
          }
        />
      ) : (
        <Box twClassName="flex-1 justify-center px-8">
          <Text variant={TextVariant.BodyMd} twClassName="text-center">
            {strings('gacha.demo.no_card')}
          </Text>
        </Box>
      )}
    </SafeAreaView>
  );
};

export default GachaDemoReveal;
