---
name: Componentization
about: For creating components for the component library
title: ''
labels: ''
assignees: ''
---

### **Description**

Describe the component. Example: What is it and what is it meant to be used for?
For more context, it is recommended to reference a Figma link or post a screenshot of the component in this section.
Example Screenshot:
![Placeholder](https://via.placeholder.com/400x200.png)

### **Technical Details**

Unless audited by Design System - Place component in `components-temp` directory location in `app/component-library/components-temp` directory.

- Component Structure (Assume `NAME` = your component's name)

  - Under `NAME` directory
    - [ ] `NAME`.tsx - Actual component file.
    - [ ] `NAME`.types.ts - Includes all TypeScript related types/interfaces/enums etc.
    - [ ] `NAME`.styles.ts - Includes styles for the `NAME` component.
    - [ ] `NAME`.test.tsx - Includes both snapshots AND unit tests.
    - [ ] `NAME`.stories.ts - Includes stories for the `NAME` component.
    - [ ] `NAME`.constants.ts - Includes any constants that is used in any `NAME` file. For example, test IDs for tests, mappings for the component, etc.
    - [ ] `NAME`.utils.ts - Includes any utility functions specific to be used with the `NAME` component.
    - [ ] index.ts - Exports both `NAME` component as default and anything else such as types, test IDs, etc if needed.
    - [ ] README.md - Documentation on how the `NAME` component will be used and the props associated with it.

- Caveat
  - Components may differ in terms of files to include depending on what is needed.
  - For example - you might not need a constants file or a styles file depending on how the component is built.
  - A more specific example - you can omit the styles file if your component doesn't require styles. Just use your best judgement.
- Refer to an example component such as `AvatarFavicon` for more details.

### **Acceptance Criteria**

- [ ] Snapshot and unit tests pass
- [ ] Storybook shows interactive version of component. Include screenshot or video in pull request for visual reference.
- [ ] Component structure should resemble the structure listed in the Technical Details section above.

### **References**

- References go here.
- Figma links.
- Slack threads.
- Etc.
