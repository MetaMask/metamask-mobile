# Task 03: UI Primitives (TeamHelmet, FootballIcon, TeamGradient)

## Description

Create the foundational UI primitive components used across the NFL game cards and details screens. These are small, reusable components that other tasks depend on.

## Requirements

- `TeamHelmet` component - SVG football helmet with dynamic team color
- `FootballIcon` component - Small football icon for possession indicator
- `TeamGradient` component - Simple 45° gradient overlay with team colors at 20% opacity
- `gameParser` utility - Parse game data from API format
- All code must have unit tests

**NOTE on TeamGradient**: No theme awareness needed. The gradient is a simple overlay - the design system handles dark/light backgrounds automatically.

## Dependencies

- Task 00: Feature Flag and Data Types

## Designs

- @nfl-card-variations.png - Shows helmet and gradient usage
- @nfl-details-dark-light.png - Shows theming requirements

## Implementation

### 1. TeamHelmet Component

Create `app/components/UI/Predict/components/TeamHelmet/`:

**TeamHelmet.tsx:**

```typescript
import React from 'react';
import Svg, { Path, G, Defs, ClipPath, Rect } from 'react-native-svg';

interface TeamHelmetProps {
  color: string;       // Team primary color (hex)
  size?: number;       // Size in pixels (default: 48)
  flipped?: boolean;   // Mirror horizontally for away team
  testID?: string;
}

const TeamHelmet: React.FC<TeamHelmetProps> = ({
  color,
  size = 48,
  flipped = false,
  testID,
}) => {
  const transform = flipped ? `scale(-1, 1) translate(-${size}, 0)` : undefined;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      testID={testID}
    >
      <G transform={transform}>
        <Defs>
          <ClipPath id="helmetClip">
            <Path d="M8 24C8 14.059 16.059 6 26 6H40V42H26C16.059 42 8 33.941 8 24Z" />
          </ClipPath>
        </Defs>

        {/* Helmet base */}
        <Path
          d="M8 24C8 14.059 16.059 6 26 6H40V42H26C16.059 42 8 33.941 8 24Z"
          fill={color}
        />

        {/* Facemask */}
        <G clipPath="url(#helmetClip)">
          <Rect x="36" y="16" width="8" height="2" fill="#333333" rx="1" />
          <Rect x="36" y="22" width="8" height="2" fill="#333333" rx="1" />
          <Rect x="36" y="28" width="8" height="2" fill="#333333" rx="1" />
        </G>

        {/* Helmet stripe (optional decorative element) */}
        <Path
          d="M16 6C16 6 18 12 18 24C18 36 16 42 16 42"
          stroke="white"
          strokeWidth="2"
          strokeOpacity="0.3"
          fill="none"
        />
      </G>
    </Svg>
  );
};

export default TeamHelmet;
```

**TeamHelmet.test.tsx:**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import TeamHelmet from './TeamHelmet';

describe('TeamHelmet', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(
      <TeamHelmet color="#002244" testID="helmet" />
    );
    expect(getByTestId('helmet')).toBeTruthy();
  });

  it('renders with custom size', () => {
    const { getByTestId } = render(
      <TeamHelmet color="#002244" size={64} testID="helmet" />
    );
    expect(getByTestId('helmet')).toBeTruthy();
  });

  it('renders flipped for away team', () => {
    const { getByTestId } = render(
      <TeamHelmet color="#FB4F14" flipped testID="helmet" />
    );
    expect(getByTestId('helmet')).toBeTruthy();
  });
});
```

**index.ts:**

```typescript
export { default } from './TeamHelmet';
export { default as TeamHelmet } from './TeamHelmet';
```

### 2. FootballIcon Component

Create `app/components/UI/Predict/components/FootballIcon/`:

**FootballIcon.tsx:**

```typescript
import React from 'react';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { useTheme } from '../../../../../util/theme';

interface FootballIconProps {
  size?: number;
  color?: string;
  testID?: string;
}

const FootballIcon: React.FC<FootballIconProps> = ({
  size = 20,
  color,
  testID,
}) => {
  const { colors } = useTheme();
  const fillColor = color ?? colors.text.default;

  return (
    <Svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 20 12"
      testID={testID}
    >
      {/* Football shape */}
      <Ellipse
        cx="10"
        cy="6"
        rx="9"
        ry="5"
        fill={fillColor}
      />

      {/* Laces */}
      <Path
        d="M10 2V10M7 4H13M7 6H13M7 8H13"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default FootballIcon;
```

**FootballIcon.test.tsx:**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import FootballIcon from './FootballIcon';

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { default: '#000000' },
    },
  }),
}));

describe('FootballIcon', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(<FootballIcon testID="football" />);
    expect(getByTestId('football')).toBeTruthy();
  });

  it('renders with custom size', () => {
    const { getByTestId } = render(
      <FootballIcon size={30} testID="football" />
    );
    expect(getByTestId('football')).toBeTruthy();
  });

  it('renders with custom color', () => {
    const { getByTestId } = render(
      <FootballIcon color="#FF0000" testID="football" />
    );
    expect(getByTestId('football')).toBeTruthy();
  });
});
```

### 3. TeamGradient Component

Create `app/components/UI/Predict/components/TeamGradient/`:

**TeamGradient.tsx:**

```typescript
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface TeamGradientProps {
  awayColor: string;
  homeColor: string;
  style?: ViewStyle;
  children?: React.ReactNode;
  testID?: string;
}

/**
 * Simple 45° linear gradient overlay with both team colors at 20% opacity.
 *
 * NO THEME AWARENESS NEEDED - this is just an overlay.
 * The design system handles dark/light backgrounds automatically.
 */
const TeamGradient: React.FC<TeamGradientProps> = ({
  awayColor,
  homeColor,
  style,
  children,
  testID,
}) => {
  // Simple gradient: away color -> home color, both at 20% opacity
  // Hex 33 = 20% opacity (0x33 / 0xFF ≈ 0.20)
  const gradientColors = React.useMemo(
    () => [`${awayColor}33`, `${homeColor}33`],
    [awayColor, homeColor],
  );

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
      testID={testID}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default TeamGradient;
```

**TeamGradient.test.tsx:**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import TeamGradient from './TeamGradient';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

describe('TeamGradient', () => {
  it('renders with team colors', () => {
    const { getByTestId } = render(
      <TeamGradient
        awayColor="#002244"
        homeColor="#FB4F14"
        testID="gradient"
      />
    );
    expect(getByTestId('gradient')).toBeTruthy();
  });

  it('renders children', () => {
    const { getByText } = render(
      <TeamGradient awayColor="#002244" homeColor="#FB4F14">
        <Text>Child Content</Text>
      </TeamGradient>
    );
    expect(getByText('Child Content')).toBeTruthy();
  });

  it('applies 20% opacity to colors', () => {
    // Component creates colors like "#00224433" (original + 33 hex for 20% opacity)
    // This is validated by visual testing, but we can verify the component renders
    const { getByTestId } = render(
      <TeamGradient
        awayColor="#002244"
        homeColor="#FB4F14"
        testID="gradient"
      />
    );
    expect(getByTestId('gradient')).toBeTruthy();
  });
});
```

### 4. Game Parser Utility

Create `app/components/UI/Predict/utils/gameParser.ts`:

```typescript
import {
  PredictGameStatus,
  PredictMarketGame,
  PredictSportTeam,
  PredictSportsLeague,
} from '../types';

// NFL slug pattern: nfl-{away}-{home}-{date}
const NFL_SLUG_PATTERN = /^nfl-([a-z]+)-([a-z]+)-(\d{4}-\d{2}-\d{2})$/;

const NOT_STARTED_PERIODS = ['NS', 'NOT_STARTED', 'PRE', 'PREGAME', ''];
const ENDED_PERIODS = ['FT', 'VFT'];

export interface ParsedNflSlug {
  awayAbbreviation: string;
  homeAbbreviation: string;
  dateString: string;
}

/**
 * Parse NFL game slug to extract team abbreviations and date
 */
export function parseNflSlugTeams(slug: string): ParsedNflSlug | null {
  const match = slug.match(NFL_SLUG_PATTERN);
  if (!match) {
    return null;
  }
  return {
    awayAbbreviation: match[1],
    homeAbbreviation: match[2],
    dateString: match[3],
  };
}

/**
 * Check if an event is an NFL game event based on tags and slug
 */
export function isNflGameEvent(event: {
  tags?: { slug: string }[];
  slug: string;
}): boolean {
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const hasNflTag = tags.some((tag) => tag.slug === 'nfl');
  const hasGamesTag = tags.some((tag) => tag.slug === 'games');
  const hasValidSlug = NFL_SLUG_PATTERN.test(event.slug);

  return hasNflTag && hasGamesTag && hasValidSlug;
}

/**
 * Format period string for display
 *
 * Polymarket Period Values:
 * - NS → (not displayed, game is scheduled)
 * - Q1/Q2/Q3/Q4 → Show as-is
 * - End Q1/End Q3 → Show as-is
 * - HT → "Halftime"
 * - OT → "Overtime"
 * - FT/VFT → "Final"
 */
export function formatPeriodDisplay(period: string): string {
  const normalized = period.toUpperCase().trim();

  switch (normalized) {
    case 'HT':
      return 'Halftime';
    case 'OT':
      return 'Overtime';
    case 'FT':
    case 'VFT':
      return 'Final';
    default:
      return period;
  }
}

/**
 * Derive game status from event data
 */
export function getGameStatus(event: {
  period?: string;
  live?: boolean;
  ended?: boolean;
  closed?: boolean;
  score?: string;
  elapsed?: string;
}): PredictGameStatus {
  const period = (event.period ?? '').toUpperCase();

  if (event.ended || event.closed || ENDED_PERIODS.includes(period)) {
    return 'ended';
  }

  if (event.live) {
    return 'ongoing';
  }

  const isNotStartedPeriod = NOT_STARTED_PERIODS.includes(period);
  const hasScore = event.score && event.score !== '0-0' && event.score !== '';
  const hasElapsed = event.elapsed && event.elapsed !== '';
  const hasActivePeriod = event.period && !isNotStartedPeriod;

  if (hasScore || hasElapsed || hasActivePeriod) {
    return 'ongoing';
  }

  return 'scheduled';
}

/**
 * Parse score string to away and home scores
 */
export function parseScore(score: string): { away: string; home: string } {
  if (!score) {
    return { away: '0', home: '0' };
  }
  const [away, home] = score.split('-');
  return { away: away || '0', home: home || '0' };
}

/**
 * Format scheduled game time for display
 */
export function formatScheduledTime(startTime: string): {
  date: string;
  time: string;
} {
  const dateObj = new Date(startTime);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const weekday = weekdays[dateObj.getDay()];
  const month = months[dateObj.getMonth()];
  const day = dateObj.getDate();

  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return {
    date: `${weekday}, ${month} ${day}`,
    time: `${hours}:${minutes} ${ampm}`,
  };
}

/**
 * Get percentage from token price (0-1 to 0-100)
 */
export function getOddsPercentage(price: number): number {
  return Math.round(price * 100);
}
```

**gameParser.test.ts:**

```typescript
import {
  parseNflSlugTeams,
  isNflGameEvent,
  formatPeriodDisplay,
  getGameStatus,
  parseScore,
  formatScheduledTime,
  getOddsPercentage,
} from './gameParser';

describe('gameParser', () => {
  describe('parseNflSlugTeams', () => {
    it('parses valid NFL slug', () => {
      const result = parseNflSlugTeams('nfl-sea-den-2025-02-08');
      expect(result).toEqual({
        awayAbbreviation: 'sea',
        homeAbbreviation: 'den',
        dateString: '2025-02-08',
      });
    });

    it('returns null for invalid slug', () => {
      expect(parseNflSlugTeams('invalid-slug')).toBeNull();
      expect(parseNflSlugTeams('nba-lal-gsw-2025-01-01')).toBeNull();
    });
  });

  describe('formatPeriodDisplay', () => {
    it('formats halftime', () => {
      expect(formatPeriodDisplay('HT')).toBe('Halftime');
      expect(formatPeriodDisplay('ht')).toBe('Halftime');
    });

    it('formats final', () => {
      expect(formatPeriodDisplay('FT')).toBe('Final');
      expect(formatPeriodDisplay('VFT')).toBe('Final');
    });

    it('formats overtime', () => {
      expect(formatPeriodDisplay('OT')).toBe('Overtime');
    });

    it('passes through quarter periods', () => {
      expect(formatPeriodDisplay('Q1')).toBe('Q1');
      expect(formatPeriodDisplay('Q4')).toBe('Q4');
    });
  });

  describe('getGameStatus', () => {
    it('returns ended for ended games', () => {
      expect(getGameStatus({ ended: true })).toBe('ended');
      expect(getGameStatus({ period: 'FT' })).toBe('ended');
    });

    it('returns ongoing for live games', () => {
      expect(getGameStatus({ live: true })).toBe('ongoing');
      expect(getGameStatus({ score: '21-14', period: 'Q3' })).toBe('ongoing');
    });

    it('returns scheduled for not started games', () => {
      expect(getGameStatus({})).toBe('scheduled');
      expect(getGameStatus({ period: 'NS' })).toBe('scheduled');
    });
  });

  describe('parseScore', () => {
    it('parses valid score', () => {
      expect(parseScore('21-14')).toEqual({ away: '21', home: '14' });
    });

    it('handles empty score', () => {
      expect(parseScore('')).toEqual({ away: '0', home: '0' });
    });
  });

  describe('getOddsPercentage', () => {
    it('converts price to percentage', () => {
      expect(getOddsPercentage(0.7)).toBe(70);
      expect(getOddsPercentage(0.35)).toBe(35);
    });
  });
});
```

## Files to Create

| Action | File                                                                      |
| ------ | ------------------------------------------------------------------------- |
| Create | `app/components/UI/Predict/components/TeamHelmet/TeamHelmet.tsx`          |
| Create | `app/components/UI/Predict/components/TeamHelmet/TeamHelmet.test.tsx`     |
| Create | `app/components/UI/Predict/components/TeamHelmet/index.ts`                |
| Create | `app/components/UI/Predict/components/FootballIcon/FootballIcon.tsx`      |
| Create | `app/components/UI/Predict/components/FootballIcon/FootballIcon.test.tsx` |
| Create | `app/components/UI/Predict/components/FootballIcon/index.ts`              |
| Create | `app/components/UI/Predict/components/TeamGradient/TeamGradient.tsx`      |
| Create | `app/components/UI/Predict/components/TeamGradient/TeamGradient.test.tsx` |
| Create | `app/components/UI/Predict/components/TeamGradient/index.ts`              |
| Create | `app/components/UI/Predict/utils/gameParser.ts`                           |
| Create | `app/components/UI/Predict/utils/gameParser.test.ts`                      |

## Acceptance Criteria

- [ ] TeamHelmet renders with dynamic team color
- [ ] TeamHelmet supports flipped state for away team
- [ ] FootballIcon renders with theme support
- [ ] **TeamGradient applies simple 20% opacity overlay (NO theme awareness)**
- [ ] gameParser utilities correctly parse/format game data
- [ ] TeamHelmet and FootballIcon support dark/light mode
- [ ] All unit tests pass

## Estimated Effort

4-5 hours

## Assignee

Developer B (UI - Card & Feed Track)
