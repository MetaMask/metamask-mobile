/**
 * Tool Registry
 *
 * Defines the schema for all AI tools.
 * Uses provider-agnostic LLMTool type.
 */

import { LLMTool } from '../providers';
import { TOOL_LIMITS } from '../config';

/**
 * Gets tool definitions for the AI agent
 */
export function getToolDefinitions(): LLMTool[] {
  const allTools: LLMTool[] = [
    {
      name: 'read_file',
      description:
        'Read the full content of a changed file to understand modifications',
      input_schema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to file (e.g. "app/core/Engine.ts")',
          },
          lines_limit: {
            type: 'number',
            description: `Max lines to read (default: ${TOOL_LIMITS.readFileMaxLines})`,
            default: TOOL_LIMITS.readFileMaxLines,
          },
        },
        required: ['file_path'],
      },
    },
    {
      name: 'get_git_diff',
      description: 'Get git diff for a file to see exact changes',
      input_schema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to file',
          },
          lines_limit: {
            type: 'number',
            description: `Max diff lines (default: ${TOOL_LIMITS.gitDiffMaxLines})`,
            default: TOOL_LIMITS.gitDiffMaxLines,
          },
        },
        required: ['file_path'],
      },
    },
    {
      name: 'find_related_files',
      description:
        'Find files related to a changed file to understand change impact depth. Example: for CI files finds workflows that call reusable workflows, scripts used in workflows, or workflows using specific scripts. For code files: finds importers, dependencies, tests.',
      input_schema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to the changed file',
          },
          search_type: {
            type: 'string',
            enum: ['importers', 'imports', 'tests', 'module', 'ci', 'all'],
            description:
              'Type of related files: importers (who uses this code), imports (what this uses), tests (test files), module (same directory), ci (CI relationships - reusable workflow callers, script usage), all (comprehensive)',
          },
          max_results: {
            type: 'number',
            description: `Max files to return (default: ${TOOL_LIMITS.relatedFilesMaxResults})`,
            default: TOOL_LIMITS.relatedFilesMaxResults,
          },
        },
        required: ['file_path', 'search_type'],
      },
    },
    {
      name: 'list_directory',
      description:
        'List files and subdirectories in a directory to understand module structure and context',
      input_schema: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: 'Path to directory (e.g. "app/core/")',
          },
        },
        required: ['directory'],
      },
    },
    {
      name: 'grep_codebase',
      description:
        'Search for patterns across the codebase to find usage, dependencies, or references',
      input_schema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description:
              'Pattern to search for (e.g. "import.*Engine", "useWallet", "export.*function")',
          },
          file_pattern: {
            type: 'string',
            description:
              'File pattern to search in (e.g. "*.tsx", "*.ts", "*"). Default: "*"',
            default: '*',
          },
          max_results: {
            type: 'number',
            description: `Max results to return (default: ${TOOL_LIMITS.grepMaxResults})`,
            default: TOOL_LIMITS.grepMaxResults,
          },
        },
        required: ['pattern'],
      },
    },
    {
      name: 'load_skill',
      description:
        'Load a domain expertise skill to assist with analysis. Use this when you need specialized knowledge for specific areas.',
      input_schema: {
        type: 'object',
        properties: {
          skill_name: {
            type: 'string',
            description:
              'Name of the skill to load (see AVAILABLE SKILLS in system prompt)',
          },
        },
        required: ['skill_name'],
      },
    },
    {
      name: 'finalize_tag_selection',
      description:
        'Submit final tag selection decision for both E2E tests and performance tests',
      input_schema: {
        type: 'object',
        properties: {
          selected_tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'E2E test tags to run',
          },
          risk_level: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
          },
          confidence: {
            type: 'number',
            description: 'Confidence 0-100',
          },
          reasoning: {
            type: 'string',
            description: 'Detailed reasoning for E2E test selection',
          },
          areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Impacted areas',
          },
          performance_tests: {
            type: 'object',
            description:
              'Performance test selection based on performance impact (empty selected_tags means no performance tests)',
            properties: {
              selected_tags: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Performance test tags to run (empty array if no performance tests needed)',
              },
              reasoning: {
                type: 'string',
                description: 'Reasoning for performance test selection',
              },
            },
            required: ['selected_tags', 'reasoning'],
          },
        },
        required: [
          'selected_tags',
          'risk_level',
          'confidence',
          'reasoning',
          'areas',
          'performance_tests',
        ],
      },
    },
    {
      name: 'finalize_test_plan_generation',
      description: 'Submit the final exploratory test plan for the release',
      input_schema: {
        type: 'object',
        properties: {
          summary: {
            type: 'object',
            description: 'High-level metrics for the test plan',
            properties: {
              total_changed_files: { type: 'number' },
              total_commits: { type: 'number' },
              critical_areas: { type: 'number' },
              high_risk_areas: { type: 'number' },
              medium_risk_areas: { type: 'number' },
              low_risk_areas: { type: 'number' },
              estimated_testing_hours: { type: 'string' },
              release_version: { type: 'string' },
            },
            required: [
              'total_changed_files',
              'critical_areas',
              'high_risk_areas',
              'estimated_testing_hours',
            ],
          },
          feature_areas: {
            type: 'array',
            description:
              'Prioritized list of feature areas with test scenarios',
            items: {
              type: 'object',
              properties: {
                feature_area: { type: 'string' },
                risk_level: {
                  type: 'string',
                  enum: ['critical', 'high', 'medium', 'low'],
                },
                risk_justification: { type: 'string' },
                impacted_components: {
                  type: 'array',
                  items: { type: 'string' },
                },
                exploratory_scenarios: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      preconditions: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      exploration_guidance: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      risk_indicators: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      related_changes: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                    required: ['id', 'title', 'description'],
                  },
                },
                platform_notes: {
                  type: 'object',
                  properties: {
                    ios: { type: 'array', items: { type: 'string' } },
                    android: { type: 'array', items: { type: 'string' } },
                    shared: { type: 'array', items: { type: 'string' } },
                  },
                },
                priority: { type: 'number' },
                exploratory_priority: {
                  type: 'number',
                  description:
                    'Score 1-10 indicating how much this area needs exploratory testing',
                },
                exploration_charters: {
                  type: 'array',
                  description: 'Specific exploration missions for this area',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      mission: {
                        type: 'string',
                        description: 'The exploration goal',
                      },
                      context: {
                        type: 'string',
                        description: 'Why this matters for this release',
                      },
                      what_ifs: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Specific questions to investigate',
                      },
                      time_box: {
                        type: 'string',
                        description: 'Suggested exploration time',
                      },
                    },
                    required: ['id', 'mission', 'what_ifs'],
                  },
                },
              },
              required: ['feature_area', 'risk_level', 'priority'],
            },
          },
          cross_cutting_concerns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Issues that span multiple feature areas',
          },
          regression_focus_areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Areas requiring extra regression attention',
          },
          platform_specific_guidance: {
            type: 'object',
            properties: {
              ios: { type: 'array', items: { type: 'string' } },
              android: { type: 'array', items: { type: 'string' } },
              shared: { type: 'array', items: { type: 'string' } },
            },
          },
          exploration_themes: {
            type: 'array',
            description:
              'Cross-cutting exploration approaches that apply across features',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Theme name (e.g., "Interruption Testing")',
                },
                description: {
                  type: 'string',
                  description: 'What this theme covers',
                },
                techniques: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific testing techniques for this theme',
                },
                applicable_areas: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Feature areas where this theme is especially relevant',
                },
              },
              required: ['name', 'description', 'techniques'],
            },
          },
          exploratory_focus_areas: {
            type: 'array',
            description:
              'Top 3-5 areas most deserving of creative exploratory testing',
            items: {
              type: 'object',
              properties: {
                feature_area: { type: 'string' },
                exploratory_priority: {
                  type: 'number',
                  description: 'Score 1-10',
                },
                reason: {
                  type: 'string',
                  description: 'Why this area needs exploration',
                },
                suggested_time_box: {
                  type: 'string',
                  description: 'Recommended exploration time',
                },
              },
              required: ['feature_area', 'exploratory_priority', 'reason'],
            },
          },
          reasoning: {
            type: 'string',
            description: 'Explanation of analysis approach and key findings',
          },
          confidence: {
            type: 'number',
            description: 'Confidence score 0-100',
          },
        },
        required: ['summary', 'feature_areas', 'reasoning', 'confidence'],
      },
    },
  ];

  return allTools;
}
