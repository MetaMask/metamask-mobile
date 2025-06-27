# Performance Testing Guide

This guide explains how to use the performance testing tools to measure and compare performance trends in the MetaMask Mobile app.

## Philosophy

The performance testing tools focus on **relative performance changes** rather than absolute assessments. This approach recognizes that:

- Performance is contextual and depends on what is being measured
- Absolute thresholds (like "good" vs "poor") are often arbitrary
- The most meaningful insights come from comparing performance over time or between different versions

## Tools

### Manual Performance Testing (`scripts/manual-performance-test.js`)

A comprehensive tool for measuring and comparing performance metrics.

#### Key Features

- **Trend Analysis**: Compare performance between baseline and current measurements
- **Baseline Management**: Save and reuse baseline measurements for consistent comparisons
- **Real-time Monitoring**: Watch for new performance files and analyze them automatically
- **Detailed Reporting**: Show absolute changes, percentage changes, and overall trends

#### Commands

```bash
# Monitor for new performance files (compares against baseline if available)
node scripts/manual-performance-test.js monitor

# Monitor and save first detected file as baseline
node scripts/manual-performance-test.js monitor --save-baseline

# Analyze the latest performance file
node scripts/manual-performance-test.js analyze

# Compare two specific performance files
node scripts/manual-performance-test.js compare <file1> <file2>

# Save a file as baseline for future comparisons
node scripts/manual-performance-test.js save-baseline <file>

# Compare a file against the saved baseline
node scripts/manual-performance-test.js compare-baseline <file>
```

#### Workflow

1. **Establish Baseline**:
   ```bash
   # Start monitoring and save first measurement as baseline
   node scripts/manual-performance-test.js monitor --save-baseline
   ```

2. **Make Changes**: Modify code, test features, etc.

3. **Measure Impact**:
   ```bash
   # Monitor and automatically compare against baseline
   node scripts/manual-performance-test.js monitor
   ```

4. **Analyze Results**: Review the trend analysis showing improvements and regressions

#### Output Interpretation

The tool provides:

- **Absolute Changes**: Raw millisecond differences
- **Percentage Changes**: Relative performance changes
- **Trend Summary**: Count of improvements vs regressions
- **Overall Assessment**: Whether performance improved, regressed, or showed mixed results

#### Example Output

```
📊 PERFORMANCE TREND ANALYSIS
================================================================================

🎯 component_render:
   📊 Baseline: 15.23ms
   📊 Current:  12.45ms
   📈 Absolute Change: -2.78ms
   📊 Percent Change: -18.25%
   ✅ IMPROVEMENT: 18.25% faster

🎯 api_call:
   📊 Baseline: 45.67ms
   📊 Current:  52.34ms
   📈 Absolute Change: 6.67ms
   📊 Percent Change: 14.61%
   📉 REGRESSION: 14.61% slower

📊 TREND SUMMARY
================================================================================
📈 Improvements: 1
📉 Regressions: 1
➡️  No Changes: 0
📊 Total Events Compared: 2

➡️ OVERALL TREND: Mixed results (1 improvements, 1 regressions)
```

## Best Practices

1. **Establish Clear Baselines**: Always measure performance before making changes
2. **Test Realistic Scenarios**: Measure performance during actual user workflows
3. **Run Multiple Tests**: Performance can vary, so run tests multiple times
4. **Focus on Trends**: Look at the overall direction rather than individual measurements
5. **Document Context**: Note what changes were made between baseline and current measurements

## Integration with Development

- Run performance tests as part of your development workflow
- Use baseline comparisons to validate that changes don't introduce regressions
- Include performance trend analysis in pull request reviews
- Monitor performance trends over time to identify gradual degradation

## Troubleshooting

- **No baseline found**: Run with `--save-baseline` to create one
- **No performance files**: Ensure the app is generating performance metrics
- **Path issues**: Use `--path` to specify custom simulator paths
- **File not found**: Check that performance files exist in the expected location 