import { parseCliArgs } from './cli-args';

describe('parseCliArgs', () => {
  it('defaults to a full check', () => {
    expect(parseCliArgs([])).toEqual({
      update: false,
      allowNew: false,
      changed: null,
      files: [],
      help: false,
    });
  });

  it('parses --update --allow-new and files', () => {
    expect(
      parseCliArgs(['--update', '--allow-new', 'app/a.tsx']),
    ).toMatchObject({ update: true, allowNew: true, files: ['app/a.tsx'] });
  });

  it('defaults --changed to origin/main', () => {
    expect(parseCliArgs(['--changed']).changed).toBe('origin/main');
  });

  it('accepts a ref for --changed', () => {
    expect(parseCliArgs(['--changed', 'HEAD~3']).changed).toBe('HEAD~3');
    expect(parseCliArgs(['--changed=main']).changed).toBe('main');
  });

  it('does not treat a file after --changed as a ref', () => {
    expect(parseCliArgs(['--changed', 'app/a.tsx'])).toMatchObject({
      changed: 'origin/main',
      files: ['app/a.tsx'],
    });
  });

  it('rejects --allow-new without --update', () => {
    expect(() => parseCliArgs(['--allow-new'])).toThrow(
      '--allow-new only applies together with --update.',
    );
  });

  it('rejects unknown options', () => {
    expect(() => parseCliArgs(['--nope'])).toThrow('Unknown option: --nope');
  });
});
