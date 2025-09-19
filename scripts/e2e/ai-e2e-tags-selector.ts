/**
 * AI-Powered E2E Tag Selector
 * Uses Claude AI to analyze code changes and intelligently select E2E test tags
 * Requires E2E_CLAUDE_API_KEY environment variable
 * Designed for CI integration
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
 
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
}

class AIE2ETagsSelector {
  private availableTags: string[];
  private isQuietMode: boolean = false;
  private knownSmokeTags = [
        'SmokeCore', 'SmokeAccounts', 'SmokeConfirmations', 'SmokeConfirmationsRedesigned',
        'SmokeSwaps', 'SmokeTrade', 'SmokeWalletUX', 'SmokeAssets', 'SmokeIdentity',
        'SmokeNetworkAbstractions', 'SmokeWalletPlatform', 'SmokeNetworkExpansion',
        'SmokeStake', 'SmokeNotifications', 'SmokeAnalytics', 'SmokeMultiChainPermissions',
        'SmokeMultiChainAPI',
      ];
  private readonly fileCategories = {
    ignore: [
      // Documentation
      '**/*.md', 'docs/', 'README*', 'CHANGELOG*', 'RELEASE.MD', 'LICENSE', 'attribution.txt',

      // CI/Build system (not affecting app functionality)
      '.github/', '**/*.yml', 'bitrise.yml', 'codecov.yml', 'crowdin.yml', 'sonar-project.properties',

      // Build scripts and utilities
      'scripts/', 'patches/',

      // Asset files
      '*.svg', '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico',

      // Build artifacts
      'build/', 'dist/', 'coverage/', '.nyc_output/', 'android/build/', 'ios/build/',
      'android/.gradle/', 'android/app/build/', 'node_modules/',

      // IDE files
      '*.project', '.classpath', '*.iml', '.vscode/', '.idea/',

      // Test artifacts
      'e2e/reports/', 'e2e/artifacts/', 'test-results/',

      // Logs and temp files
      '*.log', '*.tmp', '*.cache', '.env*',
    ],

    // High-impact shared files that should trigger comprehensive analysis
    highImpact: [
      'package.json', 'metro.config.js', 'tsconfig.json', 'babel.config.js', 'yarn.lock'
    ],

    // App-specific areas for granular analysis
    appAreas: [
      'app/core/Engine/', 'app/core/Authentication/', 'app/core/BackgroundBridge/',
      'app/components/Views/confirmations/', 'app/components/Views/Confirmations/',
      'app/actions/identity/', 'app/components/UI/AccountSelector/',
      'app/components/UI/Perps/', 'app/components/Views/Swaps/', 'app/components/Views/Bridge/',
      'app/components/UI/Rewards/', 'app/components/Views/Rewards/',
      'app/util/networks/', 'app/util/transaction-controller/',
      'app/components/Nav/', 'app/components/UI/Navbar/', 'app/components/UI/TabBar/',
      'app/components/UI/Notification/', 'app/util/notifications/',
      'app/util/analytics/', 'app/core/Analytics/',
      'app/store/', 'app/reducers/', 'app/actions/'
    ],

    // Platform-specific files
    android: ['android/'],
    ios: ['ios/'],

    // E2E test infrastructure
    e2eTests: ['e2e/specs/', 'e2e/pages/', 'e2e/selectors/']
  };

  constructor() {
    this.availableTags = this.extractTagsFromFile();
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

  private filterRelevantFiles(files: string[]): string[] {
    return files.filter(file => {
      for (const pattern of this.fileCategories.ignore) {
        if (this.matchesPattern(file, pattern)) {
          return false;
        }
      }
      return true;
    });
  }


  private matchesPattern(file: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      // Handle wildcard patterns like **/*.md, *.svg
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')  // ** matches any path depth
        .replace(/\*/g, '[^/]*') // * matches within path segment
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$|/${regexPattern}$`);
      return regex.test(file);
    } else if (pattern.endsWith('/')) {
      // Directory patterns like .github/, docs/
      const dirPattern = pattern.slice(0, -1); // Remove trailing slash
      return file.startsWith(dirPattern + '/') || file.includes('/' + dirPattern + '/');
    }
      // Exact file patterns like LICENSE, README*
      if (pattern.includes('*')) {
        // Handle simple wildcards like README*
        const regexPattern = pattern.replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(file.split('/').pop() || ''); // Check filename only
      }
      return file === pattern || file.endsWith('/' + pattern);

  }


  /**
   * Extract available tags from e2e/tags.js
   */
  private extractTagsFromFile(): string[] {
    const tagsFilePath = join(__dirname, '..', 'e2e', 'tags.js');

    try {
      const tagsContent = readFileSync(tagsFilePath, 'utf8');

      // Extract all smoke-related tags from the file
      const tags: string[] = [];

      // Match key-value patterns like smokeCore: 'SmokeCore:'
      const keyMatches = tagsContent.match(/\s*([a-zA-Z]+):\s*['"]([^'"]+)['"]/g);
      if (keyMatches) {
        for (const match of keyMatches) {
          const [, key, value] = match.match(/\s*([a-zA-Z]+):\s*['"]([^'"]+)['"]/) || [];
          if (key && (key.toLowerCase().includes('smoke') || value?.startsWith('Smoke'))) {
            // Use the key name but convert to proper format
            if (key.startsWith('Smoke')) {
              tags.push(key);
            } else if (key.includes('smoke')) {
              // Convert smokeCore -> SmokeCore
              const formatted = key.replace('smoke', 'Smoke');
              tags.push(formatted);
            } else if (value?.includes(':')) {
              // For cases like SmokeNetworkAbstractions: 'NetworkAbstractions:'
              const tagName = value.replace(':', '');
              if (!tagName.startsWith('Smoke')) {
                tags.push('Smoke' + tagName);
              } else {
                tags.push(tagName);
              }
            }
          }
        }
      }
      // Merge and deduplicate
      const allTags = [...new Set([...tags, ...this.knownSmokeTags])];
      return allTags.sort();

    } catch (error) {
      return this.knownSmokeTags; // Fallback to known tags if file read fails
    }
  }


  /**
   * Get changed files from git
   */
  private getChangedFiles(baseBranch: string, includeMainChanges: boolean = false): string[] {
    try {
      let changedFiles: string[] = [];
      const targetBranch = baseBranch || 'origin/main';

      if (includeMainChanges) {
        // Include changes that might have come from main branch merges
        this.log('📋 Including main changes - comprehensive analysis');
        try {
          // Use two-dot syntax to include both PR changes AND any main changes since branch creation
          changedFiles = execSync(`git diff --name-only ${targetBranch}..HEAD`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
          }).trim().split('\n').filter(f => f);

          this.log(`📊 Comprehensive diff against: ${targetBranch} (includes main merges)`);
        } catch {
          this.warn('Fallback: using last 20 commits for comprehensive analysis');
          changedFiles = execSync('git diff --name-only HEAD~20...HEAD', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
          }).trim().split('\n').filter(f => f);
        }
      } else {
        // Standard PR diff - only changes specific to this branch
        this.log(`📋 PR-focused analysis against: ${targetBranch}`);
        try {
          changedFiles = execSync(`git diff --name-only ${targetBranch}...HEAD`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
          }).trim().split('\n').filter(f => f);

          this.log(`📊 Found ${changedFiles.length} changed files in PR`);
        } catch {
          this.warn(`Could not diff against ${targetBranch}, using recent commits`);
          changedFiles = execSync('git diff --name-only HEAD~5...HEAD', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
          }).trim().split('\n').filter(f => f);
        }
      }

      let stagedFiles: string[] = [];
      try {
        stagedFiles = execSync('git diff --cached --name-only', {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'] // Suppress stderr
        }).trim().split('\n').filter(f => f);
      } catch {
        // Staged files check can fail in some CI environments, that's ok
        stagedFiles = [];
      }

      return [...new Set([...changedFiles, ...stagedFiles])].filter(f => f);
    } catch (error: any) {
      this.warn(`Error getting changed files: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze with Claude AI
   */
  private async analyzeWithAI(changedFiles: string[]): Promise<AIAnalysis> {
    try {
      const { Anthropic } = await import('@anthropic-ai/sdk');
      const apiKey = process.env.E2E_CLAUDE_API_KEY!;
      const anthropic = new Anthropic({ apiKey });

      const prompt = this.buildAIPrompt(changedFiles);

      this.log('🤖 Starting AI analysis...');
      this.log(`📝 Analyzing ${changedFiles.length} changed files`);

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const textContent = response.content.find(block => block.type === 'text');
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
   * Build AI prompt with categorized file analysis
   */
  private buildAIPrompt(changedFiles: string[]): string {
    const fileCount = changedFiles.length;
    const availableTagsStr = this.availableTags.join(', ');

    // Categorize files for better AI context
    const categorizedFiles = this.categorizeChangedFiles(changedFiles);
    const fileBreakdown = this.formatFileBreakdown(categorizedFiles);

    return `You are an expert E2E test strategist analyzing MetaMask mobile app changes to recommend optimal test coverage.

AVAILABLE TAGS: ${availableTagsStr}

CHANGED FILES ANALYSIS (${fileCount} total):
${fileBreakdown}

FILES BY CATEGORY:
${Object.entries(categorizedFiles).map(([category, files]) =>
  files.length > 0 ? `${category.toUpperCase()}: ${files.length} files\n${files.slice(0, 5).map(f => `  - ${f}`).join('\n')}${files.length > 5 ? `\n  ... +${files.length - 5} more` : ''}` : ''
).filter(s => s).join('\n\n')}

ANALYSIS FRAMEWORK:
1. **Risk Assessment**:
   - Low (1-5 files): Isolated changes, minimal risk
   - Medium (6-15 files): Moderate scope, cross-feature impact
   - High (16+ files): Major changes, high regression risk

2. **Granular Area Mapping** (be selective, don't default to running everything) - Use this as a guide to map changed files to areas:
   - **HIGHIMPACT**: package.json, metro.config.js, babel.config.js, yarn.lock → Include SmokeCore (infrastructure changes)
   - **APPCORE**: app/core/Engine/, app/core/Authentication/, app/store/, app/reducers/ → SmokeCore (only for core engine/state)
   - **APPCONFIRMATIONS**: app/components/Views/confirmations/ → SmokeConfirmations, SmokeConfirmationsRedesigned
   - **APPIDENTITY**: app/actions/identity/, app/components/UI/AccountSelector/ → SmokeIdentity, SmokeAccounts
   - **APPTRADING**: app/components/UI/Perps/, app/components/Views/Swaps/, app/components/Views/Bridge/ → SmokeTrade, SmokeSwaps
   - **APPREWARDS**: app/components/UI/Rewards/, app/components/Views/Rewards/ → Consider if reward features affected
   - **APPUI**: app/components/Nav/, app/components/UI/Navbar/, app/components/UI/TabBar/ → SmokeWalletUX, SmokeWalletPlatform
   - **APPWALLET**: wallet/balance/asset/token related files → SmokeAssets, SmokeWalletPlatform
   - **APPOTHER**: Other app/ files → Analyze path carefully, be conservative (don't over-select)
   - **ANDROID/IOS**: Platform-specific changes → Consider core stability but be targeted
   - **E2ETESTS**: Test infrastructure → Include SmokeCore only if major test framework changes

3. **Smart Selection Rules** (BE SELECTIVE):
   - **Don't default to running all tests** - analyze actual file paths and impact
   - **Consider "no tests needed"** for very low-risk changes (docs, minor configs, linting)
   - Only include SmokeCore for true infrastructure/core engine changes
   - Match tags to specific affected areas based on file paths
   - For minor UI changes, consider if E2E tests are even needed
   - For app/components changes, look at the specific component path to determine impact
   - Balance coverage vs cost - prefer targeted testing over comprehensive
   - If only 1-2 files changed in specific area, select only relevant tags

4. **"No Tests Needed" Scenarios** (return empty selectedTags array):
   - **Documentation only**: README, CHANGELOG, .md files, docs/
   - **Linting/formatting**: .eslintignore, .prettierrc, formatting fixes
   - **Build scripts**: scripts/ changes that don't affect app functionality
   - **CI workflows**: .github/ changes (unless they affect app builds)
   - **Minor config**: Small configuration tweaks that don't impact app logic
   - **Asset files**: Images, icons, SVGs that don't affect functionality
   - **Comments/typing**: Code comment updates, TypeScript interface changes only

RESPOND WITH JSON ONLY:
{
  "riskLevel": "low|medium|high",
  "selectedTags": ["SmokeCore", "..."] // Use empty array [] if no tests needed,
  "areas": ["core", "..."],
  "reasoning": "Detailed explanation: (1) What areas changed based on file analysis (2) Why these specific tags were chosen OR why no tests are needed (3) Risk factors considered",
  "confidence": 85 // How confident you are in this recommendation (0-100)
}`;
  }

  /**
   * Categorize changed files based on production patterns
   */
  private categorizeChangedFiles(changedFiles: string[]): {
    highImpact: string[];
    android: string[];
    ios: string[];
    e2eTests: string[];
    appCore: string[];
    appIdentity: string[];
    appTrading: string[];
    appConfirmations: string[];
    appWallet: string[];
    appRewards: string[];
    appUI: string[];
    appOther: string[];
    other: string[];
  } {
    const categories = {
      highImpact: [] as string[],
      android: [] as string[],
      ios: [] as string[],
      e2eTests: [] as string[],
      appCore: [] as string[],
      appIdentity: [] as string[],
      appTrading: [] as string[],
      appConfirmations: [] as string[],
      appWallet: [] as string[],
      appRewards: [] as string[],
      appUI: [] as string[],
      appOther: [] as string[],
      other: [] as string[]
    };

    for (const file of changedFiles) {
      const fileLower = file.toLowerCase();

      if (this.fileCategories.highImpact.some(pattern => this.matchesPattern(file, pattern))) {
        categories.highImpact.push(file);
      } else if (this.fileCategories.android.some(pattern => this.matchesPattern(file, pattern))) {
        categories.android.push(file);
      } else if (this.fileCategories.ios.some(pattern => this.matchesPattern(file, pattern))) {
        categories.ios.push(file);
      } else if (this.fileCategories.e2eTests.some(pattern => this.matchesPattern(file, pattern))) {
        categories.e2eTests.push(file);
      } else if (file.startsWith('app/')) {
        if (this.matchesAppPattern(file, ['app/core/Engine/', 'app/core/Authentication/', 'app/core/BackgroundBridge/', 'app/store/', 'app/reducers/'])) {
          categories.appCore.push(file);
        } else if (this.matchesAppPattern(file, ['app/actions/identity/', 'app/components/UI/AccountSelector/'])) {
          categories.appIdentity.push(file);
        } else if (this.matchesAppPattern(file, ['app/components/UI/Perps/', 'app/components/Views/Swaps/', 'app/components/Views/Bridge/'])) {
          categories.appTrading.push(file);
        } else if (this.matchesAppPattern(file, ['app/components/Views/confirmations/', 'app/components/Views/Confirmations/'])) {
          categories.appConfirmations.push(file);
        } else if (this.matchesAppPattern(file, ['app/components/UI/Rewards/', 'app/components/Views/Rewards/'])) {
          categories.appRewards.push(file);
        } else if (this.matchesAppPattern(file, ['app/components/Nav/', 'app/components/UI/Navbar/', 'app/components/UI/TabBar/'])) {
          categories.appUI.push(file);
        } else if (fileLower.includes('wallet') || fileLower.includes('balance') || fileLower.includes('asset') || fileLower.includes('token')) {
          categories.appWallet.push(file);
        } else {
          categories.appOther.push(file);
        }
      } else {
        categories.other.push(file);
      }
    }

    return categories;
  }

  /**
   * Check if app file matches specific app area patterns
   */
  private matchesAppPattern(file: string, patterns: string[]): boolean {
    return patterns.some(pattern => file.startsWith(pattern));
  }

  /**
   * Format file breakdown for AI prompt
   */
  private formatFileBreakdown(categorizedFiles: ReturnType<typeof this.categorizeChangedFiles>): string {
    const breakdown: string[] = [];

    Object.entries(categorizedFiles).forEach(([category, files]) => {
      if (files.length > 0) {
        breakdown.push(`${category.toUpperCase()}: ${files.length} files`);
      }
    });

    return breakdown.join(', ') || 'No files categorized';
  }

  /**
   * Legacy categorization method for compatibility
   */
  private categorizeFiles(changedFiles: string[]): {
    core: string[];
    identity: string[];
    trading: string[];
    confirmations: string[];
    wallet: string[];
    rewards: string[];
    ui: string[];
    other: string[];
  } {
    const categories = {
      core: [] as string[],
      identity: [] as string[],
      trading: [] as string[],
      confirmations: [] as string[],
      wallet: [] as string[],
      rewards: [] as string[],
      ui: [] as string[],
      other: [] as string[]
    };

    for (const file of changedFiles) {
      const fileLower = file.toLowerCase();

      if (fileLower.includes('engine') || fileLower.includes('core') || fileLower.includes('store') || fileLower.includes('reducer')) {
        categories.core.push(file);
      } else if (fileLower.includes('identity') || fileLower.includes('auth') || fileLower.includes('account') || fileLower.includes('multisrp')) {
        categories.identity.push(file);
      } else if (fileLower.includes('trade') || fileLower.includes('swap') || fileLower.includes('bridge') || fileLower.includes('perps')) {
        categories.trading.push(file);
      } else if (fileLower.includes('confirmation') || fileLower.includes('confirm')) {
        categories.confirmations.push(file);
      } else if (fileLower.includes('wallet') || fileLower.includes('balance') || fileLower.includes('asset') || fileLower.includes('token')) {
        categories.wallet.push(file);
      } else if (fileLower.includes('reward')) {
        categories.rewards.push(file);
      } else if (fileLower.includes('navigation') || fileLower.includes('tabbar') || fileLower.includes('overlay') || fileLower.includes('component')) {
        categories.ui.push(file);
      } else {
        categories.other.push(file);
      }
    }

    return categories;
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

        // Validate and clean response
        return {
          riskLevel: (['low', 'medium', 'high'].includes(parsed.riskLevel)) ? parsed.riskLevel : 'medium',
          selectedTags: Array.isArray(parsed.selectedTags) ?
                       parsed.selectedTags.filter((tag: string) => this.availableTags.includes(tag)) : [],
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

    const allChangedFiles = this.getChangedFiles(options.baseBranch, options.includeMainChanges);
    const changedFiles = this.filterRelevantFiles(allChangedFiles);

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

      analysis = await this.analyzeWithAI(changedFiles);
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
          relevant: changedFiles.length
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
        case '--help':
        case '-h':
          this.printHelp();
          process.exit(0);
      }
    }

    return options;
  }

  private printHelp(): void {
    console.log(`
AI-Enhanced Smart E2E Tag Selector

Usage: node scripts/smart-e2e-selector-ai.ts [options]

Uses Claude AI for intelligent test selection with keyword fallback.
Runs same selected tests on both iOS and Android platforms.
Designed for CI integration with matrix strategy support.

Options:
  -b, --base-branch <branch>   Base branch to compare against (default: comprehensive diff)
  -d, --dry-run               Show commands without running
  -v, --verbose               Verbose output with AI reasoning
  -o, --output <format>       Output format (default|json|tags)
  --include-main-changes       Include more changes from main branch (extends analysis window)
  -h, --help                 Show this help

Features:
  🤖 AI-powered intelligent analysis with Claude
  ✅ Unified analysis - same tests run on both iOS and Android
  📊 Risk assessment (low/medium/high)
  🔄 Automatic fallback to keyword analysis
  ⚙️ CI matrix strategy with test splitting
  🎯 Context-aware test selection

Environment:
  E2E_CLAUDE_API_KEY             Claude API key for AI analysis (optional)

Examples:
  # AI analysis for CI
  E2E_CLAUDE_API_KEY=sk-ant-xxx node scripts/smart-e2e-selector-ai.ts --output json

  # Tags only output for CI integration
  node scripts/smart-e2e-selector-ai.ts --output tags
`);
  }
}

// Run if called directly
if (require.main === module) {
  const selector = new AIE2ETagsSelector();
  selector.run();
}

export default AIE2ETagsSelector;
