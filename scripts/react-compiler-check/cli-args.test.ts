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

  it('accepts a ref with --changed=<ref>', () => {
    expect(parseCliArgs(['--changed=HEAD~3']).changed).toBe('HEAD~3');
  });

  it('does not treat the next argument as a ref', () => {
    expect(() => parseCliArgs(['--changed', 'app/components/Foo'])).toThrow(
      'Pass either --changed or a list of files, not both.',
    );
  });

  it.each(['--changed=', '--changed=--output=/tmp/x'])(
    'rejects %s',
    (arg) => {
      expect(() => parseCliArgs([arg])).toThrow('Invalid ref for --changed');
    },
  );

  it('rejects --allow-new without --update', () => {
    expect(() => parseCliArgs(['--allow-new'])).toThrow(
      '--allow-new only applies together with --update.',
    );
  });

  it('rejects unknown options', () => {
    expect(() => parseCliArgs(['--nope'])).toThrow('Unknown option: --nope');
  });
});
