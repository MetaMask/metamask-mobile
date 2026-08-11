import {
  formatInstrumentationStatus,
  formatInstrumentedFiles,
} from './instrumentation';

describe('Swaps performance instrumentation command', () => {
  it('lists every instrumented file on its own prefixed line', () => {
    const files = [
      'app/components/UI/Bridge/utils/swapsPerformanceDiagnostics.ts',
      'app/components/UI/Bridge/Views/BridgeView/index.tsx',
    ];

    const output = formatInstrumentedFiles(files);

    expect(output).toBe(
      '[SWAPS_PERF_ANALYSIS] instrumented files (2):\n' +
        '[SWAPS_PERF_ANALYSIS] - app/components/UI/Bridge/utils/swapsPerformanceDiagnostics.ts\n' +
        '[SWAPS_PERF_ANALYSIS] - app/components/UI/Bridge/Views/BridgeView/index.tsx',
    );
  });

  it('describes the not-installed state explicitly', () => {
    const output = formatInstrumentationStatus('not-installed');

    expect(output).toBe(
      'instrumentation is not installed; all temporary probes and generated files are removed',
    );
  });

  it('describes the prepared state as temporary instrumentation being installed', () => {
    const output = formatInstrumentationStatus('prepared');

    expect(output).toBe(
      'instrumentation is prepared; temporary probes and the generated diagnostics helper are installed',
    );
  });

  it('requires manual inspection for partial instrumentation', () => {
    const output = formatInstrumentationStatus('partial');

    expect(output).toBe(
      'instrumentation is partial; manual inspection is required before continuing',
    );
  });
});
