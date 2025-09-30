/**
 * AI E2E Tag Selector
 * Uses Claude AI to analyze code changes and intelligently select E2E test tags
 * Requires E2E_CLAUDE_API_KEY environment variable
 * Designed for CI integration
 */

import { join } from 'path';
import { execSync } from 'child_process';
import {  tags }from '../../e2e/tags';

const smokeTags = Object.values(tags).filter(tag => tag.includes('Smoke'));

interface AIAnalysis {
  riskLevel: 'low' | 'medium' | 'high';
  selectedTags: string[];
  areas: string[];
  reasoning: string;
  confidence: number;
  testFileInfo?: TagTestInfo[];
  totalSplits?: number;
}

interface TagTestInfo {
  tag: string;
  testFiles: string[];
  fileCount: number;
  recommendedSplits: number;
}

interface ParsedArgs {
  baseBranch: string;
  dryRun: boolean;
  verbose: boolean;
  output: 'default' | 'json' | 'tags';
  includeMainChanges: boolean;
  changedFiles?: string;
}

class AIE2ETagsSelector {
  // Tags that are actually used in existing pipelines (run-e2e-smoke-tests-*.yml)
  private readonly pipelineTags = [
    "SmokeAccounts",
    "SmokeConfirmations",
    "SmokeConfirmationsRedesigned",
    "SmokeIdentity",
    "SmokeNetworkAbstractions",
    "SmokeNetworkExpansion",
    "SmokeTrade",
    "SmokeWalletPlatform"
  ];

  private readonly availableTags = Object.values(smokeTags)
    .map(tag => tag.replace(':', '').trim())
    .filter(tag => tag.length > 0);
  private isQuietMode: boolean = false;

  constructor() {
    if (this.availableTags.length === 0) {
      throw new Error('No available Smoke tags found in e2e/tags.js');
    }
  }

  /**
   * Get the list of smoke tags that are actually used in CI pipelines
   */
  public getPipelineTags(): string[] {
    return [...this.pipelineTags];
  }

  /**
   * Get the list of available smoke tags that are NOT used in pipelines
   */
  public getUnusedTags(): string[] {
    return this.availableTags.filter(tag => !this.pipelineTags.includes(tag));
  }

  private log(message: string): void {
    if (!this.isQuietMode) {
      console.log(message);
    }
  }

  private warn(message: string): void {
    if (!this.isQuietMode) {
      console.log(message);
    }
  }

  private filterRelevantFiles(files: string[]): {
    relevantFiles: string[];
    filteredOutCount: number;
    summary: Record<string, number>;
    hasCriticalDependencyChanges: boolean;
  } {
    // Check for critical dependency changes that warrant full testing
    const hasCriticalDependencyChanges = files.some(file =>
      file.includes('yarn.lock') ||
      file.includes('package-lock.json') ||
      file === 'package.json'  // Root package.json changes
    );

    const relevantFiles = files.filter(file => {
      // Always keep app/ code files
      if (file.startsWith('app/') &&
          !file.includes('/images/') &&
          !file.includes('/fonts/')) {
        return true;
      }

      // Keep E2E related files
      if (file.includes('e2e/')) {
        return true;
      }

      // Keep critical dependency files
      if (file.includes('yarn.lock') ||
          file.includes('package-lock.json') ||
          file.includes('package.json')) {
        return true;
      }

      // Keep important config files
      if (file.includes('metro.config') ||
          file.includes('babel.config') ||
          file.includes('tsconfig') ||
          file.includes('.env')) {
        return true;
      }

      // Keep smart-e2e workflow changes
      if (file.includes('.github/workflows/smart-e2e')) {
        return true;
      }

      // Filter out irrelevant files
      if (file.includes('README.md') ||
          file.includes('CHANGELOG.md') ||
          file.includes('docs/') ||
          file.endsWith('.md') ||
          file.endsWith('.png') ||
          file.endsWith('.jpg') ||
          file.endsWith('.jpeg') ||
          file.endsWith('.svg') ||
          file.endsWith('.gif') ||
          file.includes('app/images/') ||
          file.includes('app/fonts/') ||
          file.includes('node_modules/')) {
        return false;
      }

      return true;
    });

    const summary = {
      app: relevantFiles.filter(f => f.startsWith('app/')).length,
      e2e: relevantFiles.filter(f => f.includes('e2e/')).length,
      dependencies: relevantFiles.filter(f =>
        f.includes('yarn.lock') ||
        f.includes('package.json') ||
        f.includes('package-lock.json')
      ).length,
      config: relevantFiles.filter(f =>
        f.includes('.config') ||
        f.includes('tsconfig') ||
        f.includes('.env')
      ).length,
      other: relevantFiles.length -
             relevantFiles.filter(f =>
               f.startsWith('app/') ||
               f.includes('e2e/') ||
               f.includes('package.json') ||
               f.includes('yarn.lock') ||
               f.includes('.config')
             ).length
    };

    return {
      relevantFiles,
      filteredOutCount: files.length - relevantFiles.length,
      summary,
      hasCriticalDependencyChanges
    };
  }




  /**
   * Get changed files from git
   */
  private getChangedFiles(baseBranch: string, includeMainChanges: boolean = false): string[] {
    try {
      let changedFiles: string[] = [];
      const targetBranch = baseBranch || 'origin/main';

      if (includeMainChanges) {
        // Use double-dot for comprehensive changes including main context
        this.log('📋 Comprehensive analysis - using double-dot syntax');
        changedFiles = execSync(`git diff --name-only ${targetBranch}..HEAD`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim().split('\n').filter(f => f);

        this.log(`📊 Found ${changedFiles.length} files with main context (${targetBranch}..HEAD)`);
      } else {
        // Use triple-dot for branch-specific changes only
        this.log(`📋 Branch-focused analysis - using triple-dot syntax`);
        changedFiles = execSync(`git diff --name-only ${targetBranch}...HEAD`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim().split('\n').filter(f => f);

        this.log(`📊 Found ${changedFiles.length} branch-specific changes (${targetBranch}...HEAD)`);
      }

      return changedFiles.filter(f => f);
    } catch (error: any) {
      this.warn(`Error getting changed files: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze with Claude AI
   */
  private async analyzeWithAI(changedFiles: string[], filterResult: ReturnType<typeof this.filterRelevantFiles>): Promise<AIAnalysis> {
    try {
      const { Anthropic } = require('@anthropic-ai/sdk');
      const apiKey = process.env.E2E_CLAUDE_API_KEY!;
      const anthropic = new Anthropic({ apiKey });

      const prompt = this.buildAIPrompt(changedFiles, filterResult);

      this.log('🤖 Starting AI analysis...');
      this.log(`📝 Analyzing ${changedFiles.length} relevant files (${filterResult.filteredOutCount} filtered out)`);

      const response = await anthropic.messages.create({
        model:  'claude-4-sonnet-20250514',
        max_tokens: 1500,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const textContent = response.content.find((block: any) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      const analysis = this.parseAIResponse(textContent.text);

      // Log comprehensive results
      this.log(`🎯 AI Analysis Complete:`);
      this.log(`📊 Risk Level: ${analysis.riskLevel}`);
      this.log(`✅ Selected ${analysis.selectedTags.length} tags: ${analysis.selectedTags.join(', ')}`);
      this.log(`🏗️ Affected Areas: ${analysis.areas.join(', ')}`);
      this.log(`🔍 Confidence: ${analysis.confidence}%`);
      this.log(`💭 Reasoning: ${analysis.reasoning}`);

      return analysis;

    } catch (error: any) {
      console.error(`❌ AI analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build AI prompt with clean file analysis
   */
  private buildAIPrompt(changedFiles: string[], filterResult: ReturnType<typeof this.filterRelevantFiles>): string {
    const { summary, hasCriticalDependencyChanges } = filterResult;

    return `Analyze these file changes to select appropriate MetaMask Mobile E2E smoke test tags:

CHANGE SUMMARY:
- Total files: ${changedFiles.length + filterResult.filteredOutCount} (filtered out ${filterResult.filteredOutCount} irrelevant files)
- App code: ${summary.app} files
- E2E tests: ${summary.e2e} files
- Dependencies: ${summary.dependencies} files ${hasCriticalDependencyChanges ? '⚠️ CRITICAL' : ''}
- Config: ${summary.config} files
- Other: ${summary.other} files

${hasCriticalDependencyChanges ? `
🚨 DEPENDENCY CHANGES DETECTED:
Dependencies were updated (yarn.lock/package.json changes). This typically warrants
running ALL smoke test tags due to potential wide-reaching effects.
` : ''}

RELEVANT CHANGED FILES:
${changedFiles.join('\n')}

Available smoke test tags (used in pipelines): ${this.pipelineTags.join(', ')}

${hasCriticalDependencyChanges ?
  'RECOMMENDATION: Consider selecting ALL smoke test tags due to dependency changes.' :
  'Based on the file paths and change patterns, select the most appropriate smoke test tags...'
}

SELECTION GUIDELINES:
- yarn.lock/package.json changes → Consider ALL pipeline tags (high risk)
- app/core/, app/store/, app/reducers/ → SmokeWalletPlatform
- app/components/Views/confirmations/ → SmokeConfirmations, SmokeConfirmationsRedesigned
- app/components/*Account*, app/util/*account* → SmokeAccounts
- app/components/*Swap*, app/util/*swap* → SmokeTrade
- app/components/*Identity*, app/util/*identity* → SmokeIdentity
- app/util/networks/, app/components/*Network* → SmokeNetworkAbstractions, SmokeNetworkExpansion
- config/ or e2e/ changes → Consider ALL pipeline tags (high risk)
- Small UI changes → Low risk, minimal tags
- Documentation only → No tests needed (empty array)
- Choose SmokeWalletPlatform for broad infrastructure changes
- ONLY suggest tags from the pipeline list above

RESPOND WITH JSON ONLY:
{
  "riskLevel": "low|medium|high",
  "selectedTags": ["SmokeWalletPlatform", "..."],
  "areas": ["core", "..."],
  "reasoning": "Brief explanation of why these tags were selected",
  "confidence": 85 // Confidence level 0-100
}`;
  }



  /**
   * Count test files for each tag to determine optimal splits
   */
  private async countTestFilesForTags(tags: string[]): Promise<TagTestInfo[]> {
    const tagInfo: TagTestInfo[] = [];
    const baseDir = join(__dirname, '..', '..', 'e2e', 'specs');

    for (const tag of tags) {
      try {
        // Use the same logic as run-e2e-tags-gha.sh
        const findCommand = `find "${baseDir}" -type f \\( -name "*.spec.js" -o -name "*.spec.ts" \\) -not -path "*/quarantine/*" -exec grep -l -E "\\b(${tag})\\b" {} \\; | sort -u`;

        const testFiles = execSync(findCommand, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'] // Suppress stderr
        }).trim().split('\n').filter(f => f);

        // Calculate recommended splits to aim for 3-4 tests per split
        let recommendedSplits = 0; // Default to 0 for empty tags
        if (testFiles.length > 0) {
          // Aim for 3-4 tests per split (using 3.5 as target)
          recommendedSplits = Math.ceil(testFiles.length / 3.5);
          // Cap at reasonable maximum to avoid too many small splits
          recommendedSplits = Math.min(recommendedSplits, 5);
        }

        tagInfo.push({
          tag,
          testFiles,
          fileCount: testFiles.length,
          recommendedSplits
        });

        if (recommendedSplits === 0) {
          this.log(`📊 ${tag}: ${testFiles.length} test files → 0 splits (skipped - no tests)`);
        } else {
          const testsPerSplit = Math.ceil(testFiles.length / recommendedSplits);
          this.log(`📊 ${tag}: ${testFiles.length} test files → ${recommendedSplits} splits (~${testsPerSplit} tests/split)`);
        }
      } catch (error) {
        this.warn(`⚠️ Could not count test files for tag ${tag}: ${error}`);
        // Fallback to 0 splits for unknown tags
        tagInfo.push({
          tag,
          testFiles: [],
          fileCount: 0,
          recommendedSplits: 0
        });
      }
    }

    return tagInfo;
  }

  /**
   * Count test files using the same command that will be executed in CI
   */
  private async countTestFilesForCombinedPattern(tagPattern: string): Promise<string[]> {
    const baseDir = join(__dirname, '..', '..', 'e2e', 'specs');

    try {
      // Use the exact same command as run-e2e-tags-gha.sh
      const findCommand = `find "${baseDir}" -type f \\( -name "*.spec.js" -o -name "*.spec.ts" \\) -not -path "*/quarantine/*" -exec grep -l -E "\\b(${tagPattern})\\b" {} \\; | sort -u`;

      const testFiles = execSync(findCommand, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'] // Suppress stderr
      }).trim().split('\n').filter(f => f);

      this.log(`📋 Found ${testFiles.length} test files with combined pattern "${tagPattern}"`);
      return testFiles;
    } catch (error) {
      this.warn(`⚠️ Could not count test files for combined pattern: ${error}`);
      return [];
    }
  }

  /**
   * Calculate splits based on actual files that will be executed
   */
  private calculateSplitsForActualFiles(testFiles: string[]): number {
    const totalFiles = testFiles.length;

    // Calculate splits based on actual files (aim for 4 tests per split, more conservative)
    let calculatedSplits = 0;
    if (totalFiles > 0) {
      calculatedSplits = Math.ceil(totalFiles / 4);
      // Ensure we don't have too many tiny splits
      if (calculatedSplits > totalFiles / 2) {
        calculatedSplits = Math.ceil(totalFiles / 2);
      }
      // Cap at reasonable maximum for CI resources
      calculatedSplits = Math.min(calculatedSplits, 20);
    }

    this.log(`🧮 Calculated ${calculatedSplits} total splits for ${totalFiles} actual test files (~${Math.ceil(totalFiles / calculatedSplits)} tests/split)`);
    return calculatedSplits;
  }

  /**
   * Parse AI response
   */
  private parseAIResponse(response: string): AIAnalysis {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*\n?([^`]*)\n?\s*```/) ||
                       response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonText = (jsonMatch[1] || jsonMatch[0])
          .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
          .trim();

        if (!this.isQuietMode) {
          console.log('🔍 Debug: JSON text to parse:', jsonText.substring(0, 200) + '...');
        }
        const parsed = JSON.parse(jsonText);

        // Validate and clean response - only allow pipeline tags
        const filteredTags = Array.isArray(parsed.selectedTags) ?
          parsed.selectedTags.filter((tag: string) => this.pipelineTags.includes(tag)) : [];

        return {
          riskLevel: (['low', 'medium', 'high'].includes(parsed.riskLevel)) ? parsed.riskLevel : 'medium',
          selectedTags: filteredTags,
          areas: Array.isArray(parsed.areas) ? parsed.areas : [],
          reasoning: parsed.reasoning || 'AI analysis completed',
          confidence: Math.min(100, Math.max(0, parsed.confidence || 75))
        };
      }

      throw new Error('No valid JSON found');
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }


  public async run(): Promise<void> {
    const args = process.argv.slice(2);
    const options = this.parseArgs(args);

    // Set quiet mode flag to suppress logging for json and tags output
    this.isQuietMode = options.output === 'json' || options.output === 'tags';

    // Get changed files - either from provided argument or via git
    let allChangedFiles: string[];
    if (options.changedFiles) {
      // Use provided changed files (skip git commands)
      this.log('📋 Using provided changed files (skipping git commands)');
      allChangedFiles = options.changedFiles.split(/\s+/).filter(f => f);
    } else {
      // Compute changed files via git
      this.log('📋 Computing changed files via git');
      allChangedFiles = this.getChangedFiles(options.baseBranch, options.includeMainChanges);
    }

    const filterResult = this.filterRelevantFiles(allChangedFiles);
    const { relevantFiles: changedFiles } = filterResult;

    this.log(`📁 Found ${allChangedFiles.length} total files, ${changedFiles.length} relevant for analysis`);

    if (options.verbose && changedFiles.length > 0) {
      this.log(`📄 Relevant changed files:`);
      changedFiles.slice(0, 20).forEach(file => this.log(`   ${file}`));
      if (changedFiles.length > 20) {
        this.log(`   ... and ${changedFiles.length - 20} more files`);
      }
    }

    let analysis: AIAnalysis;
      const apiKey = process.env.E2E_CLAUDE_API_KEY;
      if (!apiKey) {
        console.error('❌ E2E_CLAUDE_API_KEY not set - AI analysis required');
        process.exit(1);
      }

      analysis = await this.analyzeWithAI(changedFiles, filterResult);
      if (!analysis) {
        console.error('❌ AI analysis failed - unable to proceed');
        process.exit(1);
      }

      // Count test files and calculate splits for selected tags
      if (analysis.selectedTags.length > 0) {
        this.log('🔢 Counting test files for selected tags...');
        const testFileInfo = await this.countTestFilesForTags(analysis.selectedTags);

        // Count actual files that will be found by the combined tag pattern
        const combinedTagPattern = analysis.selectedTags.join('|');
        const actualTestFiles = await this.countTestFilesForCombinedPattern(combinedTagPattern);
        const totalSplits = this.calculateSplitsForActualFiles(actualTestFiles);

        analysis.testFileInfo = testFileInfo;
        analysis.totalSplits = totalSplits;
      }

    // Only show diagnostic output for default mode
    if (options.output === 'default') {
      console.log('🤖 AI-Powered Smart E2E Tag Selector');
      console.log('===================================');
      console.log(`📁 Found ${allChangedFiles.length} total files, ${changedFiles.length} relevant`);

      if (options.verbose && changedFiles.length > 0) {
        console.log('\n📄 Relevant changed files:');
        changedFiles.slice(0, 15).forEach(file => console.log(`   ${file}`));
        if (changedFiles.length > 15) {
          console.log(`   ... and ${changedFiles.length - 15} more files`);
        }
      }

      console.log(`\n🎯 Risk level: ${analysis.riskLevel}`);
      console.log(`✅ Selected ${analysis.selectedTags.length} tags: ${analysis.selectedTags.join(', ')}`);
      console.log(`🏗️ Affected areas: ${analysis.areas.join(', ')}`);
      console.log(`📊 Confidence: ${analysis.confidence}%`);
      console.log(`💭 Reasoning: ${analysis.reasoning}`);

      if (analysis.testFileInfo && analysis.totalSplits) {
        console.log(`\n📈 Test File Analysis:`);
        analysis.testFileInfo.forEach(info => {
          console.log(`   ${info.tag}: ${info.fileCount} files → ${info.recommendedSplits} splits`);
        });
        console.log(`🔢 Total CI splits needed: ${analysis.totalSplits} (${analysis.totalSplits} iOS + ${analysis.totalSplits} Android = ${analysis.totalSplits * 2} total jobs)`);
      }

      // Show commands for both platforms
      const iosCommand = `yarn test:e2e:ios:debug:run --testNamePattern="${analysis.selectedTags.join('|')}"`;
      const androidCommand = `yarn test:e2e:android:debug:run --testNamePattern="${analysis.selectedTags.join('|')}"`;
      console.log(`💡 iOS command: ${iosCommand}`);
      console.log(`💡 Android command: ${androidCommand}`);

      if (options.verbose) {
        console.log(`💡 Reasoning: ${analysis.reasoning}`);
      }
    }

    // Generate output based on format
    if (options.output === 'json') {
      console.log(JSON.stringify({
        selectedTags: analysis.selectedTags,
        riskLevel: analysis.riskLevel,
        totalSplits: analysis.totalSplits,
        testFileBreakdown: analysis.testFileInfo?.map(info => ({
          tag: info.tag,
          fileCount: info.fileCount,
          recommendedSplits: info.recommendedSplits
        })),
        changedFiles: {
          total: allChangedFiles.length,
          relevant: changedFiles.length,
          filteredOut: filterResult.filteredOutCount
        },
        reasoning: analysis.reasoning,
        confidence: analysis.confidence
      }, null, 2));
    } else if (options.output === 'tags') {
      console.log(analysis.selectedTags.join('\n'));
    } else if (options.output === 'default') {
      const iosCommand = `yarn test:e2e:ios:debug:run --testNamePattern="${analysis.selectedTags.join('|')}"`;
      const androidCommand = `yarn test:e2e:android:debug:run --testNamePattern="${analysis.selectedTags.join('|')}"`;
      console.log('\n🚀 Running tests on both platforms...');
      console.log('Run these commands to test both platforms:');
      console.log(`iOS: ${iosCommand}`);
      console.log(`Android: ${androidCommand}`);
    }
  }

  private parseArgs(args: string[]): ParsedArgs {
    const options: ParsedArgs = {
      baseBranch: 'origin/main', // Default to main branch for PR-focused analysis
      dryRun: false,
      verbose: false,
      output: 'default',
      includeMainChanges: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--base-branch':
        case '-b':
          options.baseBranch = args[++i];
          break;
        case '--dry-run':
        case '-d':
          options.dryRun = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--output':
        case '-o':
          options.output = args[++i] as any;
          break;
        case '--include-main-changes':
        case '--include-main':
          options.includeMainChanges = true;
          break;
        case '--changed-files':
          options.changedFiles = args[++i];
          break;
        case '--show-tags':
          this.showTagComparison();
          process.exit(0);
        case '--help':
        case '-h':
          this.printHelp();
          process.exit(0);
      }
    }

    return options;
  }

  private showTagComparison(): void {
    console.log('📊 SMOKE TAGS COMPARISON');
    console.log('========================');
    console.log();

    console.log(`✅ USED IN PIPELINES (${this.pipelineTags.length} tags):`);
    this.pipelineTags.forEach(tag => console.log(`   ${tag}`));

    const unusedTags = this.getUnusedTags();
    console.log();
    console.log(`❌ AVAILABLE BUT NOT USED IN PIPELINES (${unusedTags.length} tags):`);
    unusedTags.forEach(tag => console.log(`   ${tag}`));

    console.log();
    console.log('💡 The AI selector now only recommends tags that are used in pipelines');
    console.log('   to avoid suggesting tests that cannot run in CI.');
  }

  private printHelp(): void {
    console.log(`
AI E2E Tag Selector

Usage: node scripts/ai-e2e-tags-selector.ts [options]

Uses Claude AI for intelligent test selection with keyword fallback.
Runs same selected tests on both iOS and Android platforms.
Designed for CI integration with matrix strategy support.

Options:
  -b, --base-branch <branch>   Base branch to compare against (default: comprehensive diff)
  -d, --dry-run               Show commands without running
  -v, --verbose               Verbose output with AI reasoning
  -o, --output <format>       Output format (default|json|tags|matrix)
  --include-main-changes       Include more changes from main branch (extends analysis window)
  --changed-files <files>     Use provided changed files (skips git commands)
  --show-tags                 Show comparison of pipeline vs available tags
  -h, --help                 Show this help

Features:
  🤖 AI-powered intelligent analysis with Claude
  ✅ Unified analysis - same tests run on both iOS and Android
  📊 Risk assessment (low/medium/high)
  🔄 Automatic fallback to keyword analysis
  ⚙️ CI matrix strategy with test splitting
  🎯 Context-aware test selection
  🏷️ Only recommends tags that are used in existing pipelines

Environment:
  E2E_CLAUDE_API_KEY             Claude API key for AI analysis (optional)

Examples:
  # AI analysis for CI
  E2E_CLAUDE_API_KEY=sk-ant-xxx node scripts/ai-e2e-tags-selector.ts --output json

  # Tags only output for CI integration
  node scripts/ai-e2e-tags-selector.ts --output tags

  # Use provided changed files (skip git commands)
  node scripts/ai-e2e-tags-selector.ts --changed-files "app/core/Engine.ts package.json" --verbose

  # Show which tags are used in pipelines
  node scripts/ai-e2e-tags-selector.ts --show-tags
`);
  }
}

// Run if called directly
if (require.main === module) {
  const selector = new AIE2ETagsSelector();
  selector.run();
}

export default AIE2ETagsSelector;
