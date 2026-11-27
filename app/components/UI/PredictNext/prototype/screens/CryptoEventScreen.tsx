import React, { useState } from 'react';
import { LayoutAnimation, ScrollView } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  Box,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getProtoEvent, type ProtoCryptoEvent } from '../fixtures';
import {
  EventStatus,
  GlassHeader,
  SectionHeader,
  FeedPanel,
  UnderlineTabs,
} from '../components';
import {
  buildIntent,
  CryptoPriceChart,
  CryptoQuote,
  CryptoTradeButtons,
  cryptoOutcomes,
  cryptoStatus,
} from '../cards';
import {
  useProtoNavigation,
  type ProtoRoutes,
  type ProtoStackParamList,
} from '../navigation';
import {
  useHeldContracts,
  usePrototypeState,
  type ProtoPosition,
} from '../PrototypeState';
import { useCryptoRound } from '../simulation';
import { EventPositions, PositionsEmpty } from './GameEventScreen';

type CryptoTab = 'positions' | 'outcomes' | 'about';

export const CryptoEventScreen = () => {
  const tw = useTailwind();
  const navigation = useProtoNavigation();
  const { eventId } =
    useRoute<RouteProp<ProtoStackParamList, typeof ProtoRoutes.CRYPTO>>()
      .params;
  const event = getProtoEvent(eventId) as ProtoCryptoEvent;
  const state = usePrototypeState();
  const held = useHeldContracts(event.id);
  const round = useCryptoRound(event);
  const [tab, setTab] = useState<CryptoTab>('outcomes');
  const eventPositions = state.positions.filter(
    (position) => position.eventId === event.id,
  );
  const outcomes = cryptoOutcomes(round.upPrice, round.downPrice);

  const handleBuyMore = (position: ProtoPosition) =>
    state.openOrder({
      eventId: event.id,
      eventTitle: event.title,
      marketTitle: position.marketTitle,
      selected: {
        outcomeId: position.outcomeId,
        label: position.label,
        price: position.currentPrice,
        color: position.color,
        avatar: position.avatar,
      },
    });

  const handleTab = (next: CryptoTab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(next);
  };

  return (
    <Box twClassName="flex-1 bg-default">
      <GlassHeader
        title={event.title}
        onBack={() => navigation.goBack()}
        actions={[
          {
            iconName: IconName.Export,
            onPress: () => undefined,
            accessibilityLabel: 'Share',
          },
        ]}
      />
      <ScrollView
        stickyHeaderIndices={[1]}
        contentContainerStyle={tw.style('pb-16')}
      >
        <Box twClassName="gap-4 px-4 pb-4 pt-2">
          <Box twClassName="flex-row items-center justify-between gap-3">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {`Up or Down · ${event.ticker}`}
            </Text>
            <EventStatus status={cryptoStatus(round)} align="end" isStacked />
          </Box>
          <CryptoQuote event={event} price={round.price} delta={round.delta} />
          <CryptoPriceChart
            values={round.history.slice(-60)}
            target={round.target}
            height={160}
          />
        </Box>
        <Box twClassName="bg-default pt-2">
          <UnderlineTabs<CryptoTab>
            tabs={[
              {
                key: 'positions',
                label: eventPositions.length
                  ? `Positions · ${eventPositions.length}`
                  : 'Positions',
              },
              { key: 'outcomes', label: 'Outcomes' },
              { key: 'about', label: 'About' },
            ]}
            value={tab}
            onChange={handleTab}
          />
          <Box twClassName="h-px bg-muted" />
        </Box>
        {tab === 'positions' ? (
          eventPositions.length ? (
            <Box twClassName="pt-4">
              <EventPositions
                positions={eventPositions}
                onBuyMore={handleBuyMore}
              />
            </Box>
          ) : (
            <PositionsEmpty />
          )
        ) : tab === 'about' ? (
          <Box twClassName="gap-2 px-4 pt-4">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
              How this market resolves
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {`Resolves to Up if the ${event.asset} price at the end of the window is at or above the target. Otherwise resolves to Down.`}
            </Text>
          </Box>
        ) : (
          <Box>
            <SectionHeader title="Markets" volume="$4.8M" />
            <FeedPanel twClassName="gap-4 p-4" style={tw.style('mx-4')}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
                {event.window}
              </Text>
              {round.phase === 'resolved' ? (
                outcomes.map((outcome) => (
                  <Box
                    key={outcome.id}
                    twClassName="flex-row items-center justify-between"
                  >
                    <Text variant={TextVariant.BodyMd}>{outcome.label}</Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Bold}
                      color={
                        round.winner === outcome.id
                          ? TextColor.SuccessDefault
                          : TextColor.TextAlternative
                      }
                    >
                      {round.winner === outcome.id ? 'Won' : 'Lost'}
                    </Text>
                  </Box>
                ))
              ) : (
                <CryptoTradeButtons
                  upPrice={round.upPrice}
                  downPrice={round.downPrice}
                  upBadge={held('up')}
                  downBadge={held('down')}
                  onUp={() =>
                    state.openOrder(
                      buildIntent(
                        event.id,
                        event.title,
                        `${event.title} · ${event.window}`,
                        outcomes,
                        0,
                      ),
                    )
                  }
                  onDown={() =>
                    state.openOrder(
                      buildIntent(
                        event.id,
                        event.title,
                        `${event.title} · ${event.window}`,
                        outcomes,
                        1,
                      ),
                    )
                  }
                />
              )}
            </FeedPanel>
          </Box>
        )}
      </ScrollView>
    </Box>
  );
};
