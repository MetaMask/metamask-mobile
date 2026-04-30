/**
 * Unit tests for CampaignTile utility functions
 */

import {
  getCampaignStatus,
  formatCampaignStatusLabel,
  getCampaignPillLabel,
  getCampaignStatusInfo,
  isCampaignTypeSupported,
} from './CampaignTile.utils';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => ({
  IconName: {
    Clock: 'Clock',
    Confirmation: 'Confirmation',
    Speed: 'Speed',
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  ),
}));

import { strings } from '../../../../../../locales/i18n';

/**
 * Helper to build test CampaignDto objects.
 */
function buildCampaignDto(overrides: Partial<CampaignDto> = {}): CampaignDto {
  return {
    id: 'campaign-1',
    type: CampaignType.ONDO_HOLDING,
    name: 'Test Campaign',
    startDate: '2025-06-01T00:00:00.000Z',
    endDate: '2025-12-31T23:59:59.999Z',
    termsAndConditions: null,
    excludedRegions: [],
    details: null,
    featured: true,
    ...overrides,
  };
}

describe('CampaignTile.utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getCampaignStatus', () => {
    it('returns upcoming when now is before startDate', () => {
      const fixedNow = new Date('2025-01-15T12:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);

      const campaign = buildCampaignDto({
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      });

      const result = getCampaignStatus(campaign);

      expect(result).toBe('upcoming');
    });

    it('returns active when now is within startDate and endDate', () => {
      const fixedNow = new Date('2025-08-15T12:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);

      const campaign = buildCampaignDto({
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      });

      const result = getCampaignStatus(campaign);

      expect(result).toBe('active');
    });

    it('returns active when now equals startDate', () => {
      const fixedNow = new Date('2025-06-01T00:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);

      const campaign = buildCampaignDto({
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      });

      const result = getCampaignStatus(campaign);

      expect(result).toBe('active');
    });

    it('returns complete when now is after endDate', () => {
      const fixedNow = new Date('2026-01-15T12:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);

      const campaign = buildCampaignDto({
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      });

      const result = getCampaignStatus(campaign);

      expect(result).toBe('complete');
    });

    it('returns complete when now equals endDate', () => {
      const fixedNow = new Date('2025-12-31T23:59:59.999Z');
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);

      const campaign = buildCampaignDto({
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      });

      const result = getCampaignStatus(campaign);

      expect(result).toBe('complete');
    });
  });

  describe('formatCampaignStatusLabel', () => {
    it('returns localized starts_date for upcoming status with formatted startDate', () => {
      const campaign = buildCampaignDto({
        startDate: '2025-03-15T14:30:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      });

      const result = formatCampaignStatusLabel('upcoming', campaign);

      expect(strings).toHaveBeenCalledWith('rewards.campaign.starts_date', {
        date: 'March 15',
      });
      expect(result).toContain('rewards.campaign.starts_date:');
      expect(result).toContain('"date"');
    });

    it('returns localized ends_date for active status with formatted endDate', () => {
      const campaign = buildCampaignDto({
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:00.000Z',
      });

      const result = formatCampaignStatusLabel('active', campaign);

      expect(strings).toHaveBeenCalledWith('rewards.campaign.ends_date', {
        date: 'December 31',
      });
      expect(result).toContain('rewards.campaign.ends_date:');
      expect(result).toContain('"date"');
    });

    it('returns localized ended_date for complete status with formatted endDate', () => {
      const campaign = buildCampaignDto({
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-07-04T18:00:00.000Z',
      });

      const result = formatCampaignStatusLabel('complete', campaign);

      expect(strings).toHaveBeenCalledWith('rewards.campaign.ended_date', {
        date: 'July 4',
      });
      expect(result).toContain('rewards.campaign.ended_date:');
      expect(result).toContain('"date"');
    });

    it('returns empty string for unknown status', () => {
      const campaign = buildCampaignDto();

      const result = formatCampaignStatusLabel(
        'unknown' as 'upcoming' | 'active' | 'complete',
        campaign,
      );

      expect(result).toBe('');
    });
  });

  describe('getCampaignPillLabel', () => {
    it('returns pill_up_next (Coming soon) for upcoming status', () => {
      const result = getCampaignPillLabel('upcoming');

      expect(strings).toHaveBeenCalledWith('rewards.campaign.pill_up_next');
      expect(result).toBe('rewards.campaign.pill_up_next');
    });

    it('returns pill_active for active status', () => {
      const result = getCampaignPillLabel('active');

      expect(strings).toHaveBeenCalledWith('rewards.campaign.pill_active');
      expect(result).toBe('rewards.campaign.pill_active');
    });

    it('returns pill_complete for complete status', () => {
      const result = getCampaignPillLabel('complete');

      expect(strings).toHaveBeenCalledWith('rewards.campaign.pill_complete');
      expect(result).toBe('rewards.campaign.pill_complete');
    });

    it('returns empty string for unknown status', () => {
      const result = getCampaignPillLabel(
        'unknown' as 'upcoming' | 'active' | 'complete',
      );

      expect(result).toBe('');
    });
  });

  describe('getCampaignStatusInfo', () => {
    it('combines status, pill label, description, and icon for upcoming campaign', () => {
      const fixedNow = new Date('2025-01-15T12:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);

      const campaign = buildCampaignDto({
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      });

      const result = getCampaignStatusInfo(campaign);

      expect(result).toEqual({
        status: 'upcoming',
        statusLabel: 'rewards.campaign.pill_up_next',
        dateLabel: expect.stringContaining('rewards.campaign.starts_date'),
        dateLabelIcon: 'Speed',
      });
    });

    it('combines status, pill label, description, and icon for active campaign', () => {
      const fixedNow = new Date('2025-08-15T12:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);

      const campaign = buildCampaignDto({
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      });

      const result = getCampaignStatusInfo(campaign);

      expect(result).toEqual({
        status: 'active',
        statusLabel: 'rewards.campaign.pill_active',
        dateLabel: expect.stringContaining('rewards.campaign.ends_date'),
        dateLabelIcon: 'Clock',
      });
    });

    it('combines status, pill label, description, and icon for complete campaign', () => {
      const fixedNow = new Date('2026-01-15T12:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);

      const campaign = buildCampaignDto({
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      });

      const result = getCampaignStatusInfo(campaign);

      expect(result).toEqual({
        status: 'complete',
        statusLabel: 'rewards.campaign.pill_complete',
        dateLabel: expect.stringContaining('rewards.campaign.ended_date'),
        dateLabelIcon: 'Confirmation',
      });
    });
  });

  describe('isCampaignTypeSupported', () => {
    it('returns true for ONDO_HOLDING campaign type', () => {
      expect(isCampaignTypeSupported(CampaignType.ONDO_HOLDING)).toBe(true);
    });

    it('returns true for SEASON_1 campaign type', () => {
      expect(isCampaignTypeSupported(CampaignType.SEASON_1)).toBe(true);
    });

    it('returns false for unknown campaign types', () => {
      expect(isCampaignTypeSupported('UNKNOWN' as CampaignType)).toBe(false);
    });
  });
});
