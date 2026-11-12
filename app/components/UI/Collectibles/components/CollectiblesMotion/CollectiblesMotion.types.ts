export interface CollectionTransferRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CollectiblesMotionConfiguration {
  kind:
    | 'card'
    | 'reveal'
    | 'pack'
    | 'marketplace'
    | 'coins'
    | 'collectionTransfer'
    | 'collectionArrival'
    | 'collectionAmount';
  identity: string;
  name: string;
  front: string;
  back?: string;
  amount?: {
    from: number;
    to: number;
    currency: string;
    delay?: number;
    locale?: string;
    textColor?: string;
  };
  transfers?: {
    id: string;
    front: string;
    from: CollectionTransferRect;
    to?: CollectionTransferRect;
  }[];
  source?: { x: number; y: number };
  target?: { x: number; y: number };
  packCapture?: number;
  packFloating?: boolean;
  packFloatTime?: number;
  packFloatTransform?: string;
  packArt?: string;
  year?: string;
  grader?: string;
  grade?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic';
  presentation?: 'detail' | 'reveal';
  soldLabel?: string;
  slashLabel?: string;
}

export type CollectiblesMotionMessage =
  | 'ready'
  | 'imageReady'
  | 'revealed'
  | 'completed'
  | 'error';

/** Only presentation notifications cross this boundary, never executable actions. */
export function parseMotionMessage(
  data: string,
): CollectiblesMotionMessage | undefined {
  try {
    const value: unknown = JSON.parse(data);
    if (typeof value !== 'object' || value === null || !('type' in value))
      return undefined;
    return value.type === 'ready' ||
      value.type === 'imageReady' ||
      value.type === 'revealed' ||
      value.type === 'completed' ||
      value.type === 'error'
      ? value.type
      : undefined;
  } catch {
    return undefined;
  }
}

/** Landing only restores an artwork already present in this scene's payload. */
export function parseCollectionCardLanded(
  data: string,
  cards: CollectiblesMotionConfiguration['transfers'],
): string | undefined {
  try {
    const value: unknown = JSON.parse(data);
    if (
      typeof value !== 'object' ||
      value === null ||
      !('type' in value) ||
      value.type !== 'collectionCardLanded' ||
      !('id' in value) ||
      typeof value.id !== 'string'
    )
      return undefined;
    return cards?.some((card) => card.id === value.id) ? value.id : undefined;
  } catch {
    return undefined;
  }
}

export interface PackPresentationPose {
  transform: string;
  time: number;
}
/** Strictly presentation-only pack click; never accepts a purchase or an arbitrary command. */
export function parsePackPresentationPose(
  data: string,
): PackPresentationPose | undefined {
  try {
    const value: unknown = JSON.parse(data);
    if (
      typeof value !== 'object' ||
      value === null ||
      !('type' in value) ||
      value.type !== 'packPress' ||
      !('transform' in value) ||
      typeof value.transform !== 'string' ||
      !('time' in value) ||
      typeof value.time !== 'number' ||
      !Number.isFinite(value.time)
    )
      return undefined;
    if (
      value.transform !== 'none' &&
      !/^matrix(?:3d)?\([-0-9., eE+]+\)$/u.test(value.transform)
    )
      return undefined;
    return { transform: value.transform, time: Math.max(0, value.time) };
  } catch {
    return undefined;
  }
}
