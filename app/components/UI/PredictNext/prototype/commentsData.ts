import type { SocialV1FeedAuthor } from '../../SocialFeed/types';
import type { FeedReaction } from '../../SocialFeed/reactions';
import { HOUR, MINUTE } from '../../../../constants/time';

/** A holder's side on the market, shown as a tag under their name. */
export interface ProtoCommentSide {
  label: string;
  /** Cents the holder paid. */
  price: number;
  isPositive: boolean;
}

export interface ProtoComment {
  id: string;
  author: SocialV1FeedAuthor;
  text: string;
  timestampMs: number;
  side?: ProtoCommentSide;
  reactions: FeedReaction[];
  userReaction: string | null;
  replies: ProtoComment[];
}

/** Social V1 author shape, so the sheet reuses the real identity row. */
const author = (
  id: string,
  username: string,
  winRatePercent: number | null,
  extra: Partial<SocialV1FeedAuthor> = {},
): SocialV1FeedAuthor => ({
  id,
  username,
  address: `0x${id.padEnd(40, '0').slice(0, 40)}`,
  avatarUri: null,
  winRatePercent,
  ...extra,
});

export const PROTO_AUTHORS = {
  doji: author('v1-trader-doji', 'Doji', 92, {
    pnl30d: 50_000,
    followerCount: 17_200,
    verified: true,
  }),
  marlow: author('v1-trader-marlow', 'marlow.eth', 74, {
    pnl30d: 12_400,
    followerCount: 3_100,
  }),
  tessa: author('v1-trader-tessa', 'TessaTrades', 81, {
    pnl30d: 21_900,
    followerCount: 8_450,
    xHandle: 'tessatrades',
  }),
  kenji: author('v1-trader-kenji', 'kenji', 63, { followerCount: 920 }),
  rook: author('v1-trader-rook', 'rook', 58, { followerCount: 410 }),
  vee: author('v1-trader-vee', 'vee.sol', 88, {
    pnl30d: 33_700,
    followerCount: 11_300,
    verified: true,
  }),
  you: author('v1-trader-you', 'You', null),
} as const;

const reactions = (...entries: [string, number][]): FeedReaction[] =>
  entries.map(([emotion, count]) => ({ emotion, count }));

const ago = (ms: number) => Date.now() - ms;

/** Comments already on the market when the sheet opens. Newest first. */
export const seedComments = (eventId: string): ProtoComment[] => [
  {
    id: `${eventId}-c1`,
    author: PROTO_AUTHORS.doji,
    text: 'Price still looks light for how this has played out. Adding on any dip.',
    timestampMs: ago(4 * MINUTE),
    side: { label: 'Yes', price: 62, isPositive: true },
    reactions: reactions(['🔥', 14], ['📈', 6], ['👍', 3]),
    userReaction: null,
    replies: [
      {
        id: `${eventId}-c1-r1`,
        author: PROTO_AUTHORS.marlow,
        text: 'Same read. The last stretch decides it.',
        timestampMs: ago(2 * MINUTE),
        reactions: reactions(['👍', 2]),
        userReaction: null,
        replies: [],
      },
    ],
  },
  {
    id: `${eventId}-c2`,
    author: PROTO_AUTHORS.tessa,
    text: 'Fading the crowd here. Everyone is on one side, which usually means the number is stale.',
    timestampMs: ago(11 * MINUTE),
    side: { label: 'No', price: 41, isPositive: false },
    reactions: reactions(['👀', 9], ['😂', 2]),
    userReaction: null,
    replies: [],
  },
  {
    id: `${eventId}-c3`,
    author: PROTO_AUTHORS.kenji,
    text: 'Not touching it until the next update lands.',
    timestampMs: ago(26 * MINUTE),
    reactions: reactions(['👍', 4]),
    userReaction: null,
    replies: [],
  },
  {
    id: `${eventId}-c4`,
    author: PROTO_AUTHORS.vee,
    text: 'Took profit on half. Letting the rest ride.',
    timestampMs: ago(48 * MINUTE),
    side: { label: 'Yes', price: 54, isPositive: true },
    reactions: reactions(['💎', 7], ['🚀', 5]),
    userReaction: null,
    replies: [],
  },
  {
    id: `${eventId}-c5`,
    author: PROTO_AUTHORS.rook,
    text: 'Volume picked up fast. Something is moving this.',
    timestampMs: ago(1 * HOUR + 12 * MINUTE),
    reactions: reactions(['❗', 3]),
    userReaction: null,
    replies: [],
  },
];

const INCOMING: {
  author: SocialV1FeedAuthor;
  text: string;
  side?: ProtoCommentSide;
}[] = [
  {
    author: PROTO_AUTHORS.vee,
    text: 'Odds just swung. Anyone else see that?',
    side: { label: 'Yes', price: 58, isPositive: true },
  },
  {
    author: PROTO_AUTHORS.kenji,
    text: 'This is why I stay small on live markets.',
  },
  {
    author: PROTO_AUTHORS.tessa,
    text: 'Bought more No at that price.',
    side: { label: 'No', price: 39, isPositive: false },
  },
  {
    author: PROTO_AUTHORS.marlow,
    text: 'Chat is moving faster than the price.',
  },
  { author: PROTO_AUTHORS.rook, text: 'Called it ten minutes ago.' },
  {
    author: PROTO_AUTHORS.doji,
    text: 'Still holding. Not selling into this.',
    side: { label: 'Yes', price: 62, isPositive: true },
  },
];

/** The nth simulated incoming comment, cycling through the pool. */
export const incomingComment = (
  eventId: string,
  index: number,
): ProtoComment => {
  const entry = INCOMING[index % INCOMING.length];
  return {
    id: `${eventId}-live-${index}`,
    author: entry.author,
    text: entry.text,
    side: entry.side,
    timestampMs: Date.now(),
    reactions: [],
    userReaction: null,
    replies: [],
  };
};

export const youComment = (eventId: string, text: string): ProtoComment => ({
  id: `${eventId}-you-${Date.now()}`,
  author: PROTO_AUTHORS.you,
  text,
  timestampMs: Date.now(),
  reactions: [],
  userReaction: null,
  replies: [],
});

export type CommentSort = 'Top' | 'Newest' | 'Holders';
export const COMMENT_SORTS: readonly CommentSort[] = [
  'Top',
  'Newest',
  'Holders',
];

const reactionTotal = (comment: ProtoComment) =>
  comment.reactions.reduce((sum, reaction) => sum + reaction.count, 0);

export const sortComments = (
  comments: ProtoComment[],
  sort: CommentSort,
): ProtoComment[] => {
  if (sort === 'Holders') {
    return comments.filter((comment) => comment.side);
  }
  const copy = [...comments];
  return sort === 'Top'
    ? copy.sort((a, b) => reactionTotal(b) - reactionTotal(a))
    : copy.sort((a, b) => b.timestampMs - a.timestampMs);
};

/** Applies one reaction toggle: leaves the old emoji, joins the new one. */
export const toggleReaction = (
  comment: Pick<ProtoComment, 'reactions' | 'userReaction'>,
  emotion: string,
): Pick<ProtoComment, 'reactions' | 'userReaction'> => {
  const leaving = comment.userReaction;
  const joining = leaving === emotion ? null : emotion;
  const next = comment.reactions
    .map((reaction) => {
      if (reaction.emotion === leaving) {
        return { ...reaction, count: reaction.count - 1 };
      }
      return reaction;
    })
    .map((reaction) =>
      reaction.emotion === joining
        ? { ...reaction, count: reaction.count + 1 }
        : reaction,
    );
  if (joining && !next.some((reaction) => reaction.emotion === joining)) {
    next.push({ emotion: joining, count: 1 });
  }
  return {
    reactions: next.filter((reaction) => reaction.count > 0),
    userReaction: joining,
  };
};
