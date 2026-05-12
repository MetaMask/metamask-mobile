import { getOutcomeGroupLabel } from './outcomeGroupLabel';
import { strings } from '../../../../../locales/i18n';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

const mockStrings = strings as jest.MockedFunction<typeof strings>;

describe('getOutcomeGroupLabel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the i18n translation when available', () => {
    mockStrings.mockReturnValue('Game Lines');

    const result = getOutcomeGroupLabel('game_lines');

    expect(result).toBe('Game Lines');
    expect(mockStrings).toHaveBeenCalledWith(
      'predict.outcome_groups.game_lines',
    );
  });

  it('falls back to title-cased key when i18n returns the key path', () => {
    mockStrings.mockImplementation((key: string) => key);

    const result = getOutcomeGroupLabel('game_lines');

    expect(result).toBe('Game Lines');
  });

  it('title-cases multi-word keys', () => {
    mockStrings.mockImplementation((key: string) => key);

    const result = getOutcomeGroupLabel('both_teams_to_score');

    expect(result).toBe('Both Teams To Score');
  });

  it('title-cases single-word keys', () => {
    mockStrings.mockImplementation((key: string) => key);

    const result = getOutcomeGroupLabel('assists');

    expect(result).toBe('Assists');
  });
});
