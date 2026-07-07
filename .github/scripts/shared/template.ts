import { PR_TEMPLATE_SECTIONS } from './pr-template-checks';

interface Template {
  titles: string[];
}

// An enum for different templates and issue/PR can match
export enum TemplateType {
  GeneralIssue,
  BugReportIssue,
  PullRequest,
  None,
}

// Titles of general issue template
const generalIssueTemplateTitles = [
  '### What is this about?',
  '### Scenario',
  '### Design',
  '### Technical Details',
  '### Threat Modeling Framework',
  '### Acceptance Criteria',
  '### References',
];

// Titles of bug report template
const bugReportIssueTemplateTitles = [
  '### Describe the bug',
  '### Expected behavior',
  '### Screenshots', // TODO: replace '### Screenshots' by '### Screenshots/Recordings' in January 2024 (as most issues will meet this criteria by then)
  '### Steps to reproduce',
  '### Version',
  '### Build type',
  '### Device',
  '### Operating system',
  '### Additional context',
  '### Severity',
];

export const templates = new Map<TemplateType, Template>([
  [
    TemplateType.GeneralIssue,
    {
      titles: generalIssueTemplateTitles,
    },
  ],
  [
    TemplateType.BugReportIssue,
    {
      titles: bugReportIssueTemplateTitles,
    },
  ],
  [
    TemplateType.PullRequest,
    {
      titles: PR_TEMPLATE_SECTIONS,
    },
  ],
]);
