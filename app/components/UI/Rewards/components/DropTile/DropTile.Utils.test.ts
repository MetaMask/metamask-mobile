/**
 * Unit tests for DropTile utility functions
 */

import { IconName } from '@metamask/design-system-react-native';
import {
  DropStatus,
  SeasonDropDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  formatDropStatusLabel,
  getDropPillLabel,
  getDropStatusInfo,
} from './DropTile.Utils';

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    const templates: Record<string, string> = {
      'rewards.drop.starts_date': `Starts ${params?.date}`,
      'rewards.drop.ends_date': `Ends ${params?.date}`,
      'rewards.drop.results_coming_soon': 'Results coming soon',
      'rewards.drop.tokens_on_the_way': 'Tokens on the way',
      'rewards.drop.pill_up_next': 'Up Next',
      'rewards.drop.pill_live_now': 'Live Now',
      'rewards.drop.pill_calculating': 'Calculating',
      'rewards.drop.pill_results_ready': 'Results Ready',
      'rewards.drop.pill_complete': 'Complete',
    };
    return templates[key] || key;
  }),
}));

describe('DropTile.Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatDropStatusLabel', () => {
    it('formats UPCOMING status with opens date', () => {
      const drop = {
        opensAt: '2025-03-15T14:30:00Z',
        closesAt: '2025-03-20T14:30:00Z',
        status: DropStatus.UPCOMING,
      } as SeasonDropDto;

      const result = formatDropStatusLabel(DropStatus.UPCOMING, drop);

      expect(result).toContain('Starts');
      expect(result).toContain('Mar 15');
    });

    it('formats OPEN status with closes date', () => {
      const drop = {
        opensAt: '2025-03-15T14:30:00Z',
        closesAt: '2025-03-20T14:30:00Z',
        status: DropStatus.OPEN,
      } as SeasonDropDto;

      const result = formatDropStatusLabel(DropStatus.OPEN, drop);

      expect(result).toContain('Ends');
      expect(result).toContain('Mar 20');
    });

    it('formats CLOSED status with static text', () => {
      const drop = {
        status: DropStatus.CLOSED,
      } as SeasonDropDto;

      const result = formatDropStatusLabel(DropStatus.CLOSED, drop);

      expect(result).toBe('Results coming soon');
    });

    it('formats CALCULATED status with static text', () => {
      const drop = {
        status: DropStatus.CALCULATED,
      } as SeasonDropDto;

      const result = formatDropStatusLabel(DropStatus.CALCULATED, drop);

      expect(result).toBe('Tokens on the way');
    });

    it('formats DISTRIBUTED status with distribution date', () => {
      const drop = {
        distributedAt: '2025-03-25T10:00:00Z',
        status: DropStatus.DISTRIBUTED,
      } as SeasonDropDto;

      const result = formatDropStatusLabel(DropStatus.DISTRIBUTED, drop);

      expect(result).toContain('Mar 25');
    });

    it('uses current date for DISTRIBUTED when distributedAt is null', () => {
      const drop = {
        distributedAt: null,
        status: DropStatus.DISTRIBUTED,
      } as unknown as SeasonDropDto;

      const result = formatDropStatusLabel(DropStatus.DISTRIBUTED, drop);

      // Should return a valid date string
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('formats time with AM/PM correctly', () => {
      const dropAM = {
        opensAt: '2025-03-15T09:30:00Z',
        status: DropStatus.UPCOMING,
      } as SeasonDropDto;

      const dropPM = {
        opensAt: '2025-03-15T14:30:00Z',
        status: DropStatus.UPCOMING,
      } as SeasonDropDto;

      const resultAM = formatDropStatusLabel(DropStatus.UPCOMING, dropAM);
      const resultPM = formatDropStatusLabel(DropStatus.UPCOMING, dropPM);

      // Should contain either AM or PM
      expect(resultAM).toMatch(/AM|PM/);
      expect(resultPM).toMatch(/AM|PM/);
    });

    it('formats midnight correctly', () => {
      const drop = {
        opensAt: '2025-03-15T00:15:00Z',
        status: DropStatus.UPCOMING,
      } as SeasonDropDto;

      const result = formatDropStatusLabel(DropStatus.UPCOMING, drop);

      // Should contain time with correct minute padding
      expect(result).toMatch(/\d{1,2}:15 (AM|PM)/);
    });

    it('formats noon correctly', () => {
      const drop = {
        opensAt: '2025-03-15T12:45:00Z',
        status: DropStatus.UPCOMING,
      } as SeasonDropDto;

      const result = formatDropStatusLabel(DropStatus.UPCOMING, drop);

      // Should contain time with correct minute padding
      expect(result).toMatch(/\d{1,2}:45 (AM|PM)/);
    });

    it('pads minutes with leading zero', () => {
      const drop = {
        opensAt: '2025-03-15T14:05:00Z',
        status: DropStatus.UPCOMING,
      } as SeasonDropDto;

      const result = formatDropStatusLabel(DropStatus.UPCOMING, drop);

      expect(result).toContain(':05');
    });

    it('returns empty string for unknown status', () => {
      const drop = {
        status: 'UNKNOWN' as DropStatus,
      } as SeasonDropDto;

      const result = formatDropStatusLabel('UNKNOWN' as DropStatus, drop);

      expect(result).toBe('');
    });
  });

  describe('getDropPillLabel', () => {
    it('returns "Up Next" for UPCOMING status', () => {
      expect(getDropPillLabel(DropStatus.UPCOMING)).toBe('Up Next');
    });

    it('returns "Live Now" for OPEN status', () => {
      expect(getDropPillLabel(DropStatus.OPEN)).toBe('Live Now');
    });

    it('returns "Calculating" for CLOSED status', () => {
      expect(getDropPillLabel(DropStatus.CLOSED)).toBe('Calculating');
    });

    it('returns "Results Ready" for CALCULATED status', () => {
      expect(getDropPillLabel(DropStatus.CALCULATED)).toBe('Results Ready');
    });

    it('returns "Complete" for DISTRIBUTED status', () => {
      expect(getDropPillLabel(DropStatus.DISTRIBUTED)).toBe('Complete');
    });

    it('returns empty string for unknown status', () => {
      expect(getDropPillLabel('UNKNOWN' as DropStatus)).toBe('');
    });
  });

  describe('getDropStatusInfo', () => {
    it('returns complete status info for UPCOMING drop', () => {
      const drop = {
        status: DropStatus.UPCOMING,
        opensAt: '2025-03-15T14:30:00Z',
        closesAt: '2025-03-20T14:30:00Z',
      } as SeasonDropDto;

      const result = getDropStatusInfo(drop);

      expect(result.status).toBe(DropStatus.UPCOMING);
      expect(result.statusLabel).toBe('Up Next');
      expect(result.statusDescription).toContain('Starts');
      expect(result.statusDescriptionIcon).toBe(IconName.Speed);
    });

    it('returns complete status info for OPEN drop', () => {
      const drop = {
        status: DropStatus.OPEN,
        opensAt: '2025-03-15T14:30:00Z',
        closesAt: '2025-03-20T14:30:00Z',
      } as SeasonDropDto;

      const result = getDropStatusInfo(drop);

      expect(result.status).toBe(DropStatus.OPEN);
      expect(result.statusLabel).toBe('Live Now');
      expect(result.statusDescription).toContain('Ends');
      expect(result.statusDescriptionIcon).toBe(IconName.Clock);
    });

    it('returns complete status info for CLOSED drop', () => {
      const drop = {
        status: DropStatus.CLOSED,
      } as SeasonDropDto;

      const result = getDropStatusInfo(drop);

      expect(result.status).toBe(DropStatus.CLOSED);
      expect(result.statusLabel).toBe('Calculating');
      expect(result.statusDescription).toBe('Results coming soon');
      expect(result.statusDescriptionIcon).toBe(IconName.Loading);
    });

    it('returns complete status info for CALCULATED drop', () => {
      const drop = {
        status: DropStatus.CALCULATED,
      } as SeasonDropDto;

      const result = getDropStatusInfo(drop);

      expect(result.status).toBe(DropStatus.CALCULATED);
      expect(result.statusLabel).toBe('Results Ready');
      expect(result.statusDescription).toBe('Tokens on the way');
      expect(result.statusDescriptionIcon).toBe(IconName.Confirmation);
    });

    it('returns complete status info for DISTRIBUTED drop', () => {
      const drop = {
        status: DropStatus.DISTRIBUTED,
        distributedAt: '2025-03-25T10:00:00Z',
      } as SeasonDropDto;

      const result = getDropStatusInfo(drop);

      expect(result.status).toBe(DropStatus.DISTRIBUTED);
      expect(result.statusLabel).toBe('Complete');
      expect(result.statusDescription).toContain('Mar 25');
      expect(result.statusDescriptionIcon).toBe(IconName.Send);
    });

    it('handles all properties in returned object', () => {
      const drop = {
        status: DropStatus.OPEN,
        opensAt: '2025-03-15T14:30:00Z',
        closesAt: '2025-03-20T14:30:00Z',
      } as SeasonDropDto;

      const result = getDropStatusInfo(drop);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('statusLabel');
      expect(result).toHaveProperty('statusDescription');
      expect(result).toHaveProperty('statusDescriptionIcon');
    });
  });
});
