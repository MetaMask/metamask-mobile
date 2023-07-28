<!--
Thanks for your contribution!

Please ensure that any applicable requirements below are satisfied before submitting this pull request. This will help ensure a quick and efficient review cycle.
-->

**Development & PR Process**
1. Follow MetaMask [Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/coding_guidelines/CODING_GUIDELINES.md)
2. Add `release-xx` label to identify the PR slated for a upcoming release (will be used in release discussion)
3. Add `needs-dev-review` label when work is completed
4. Add the appropiate QA label when dev review is completed
    - `needs-qa`: PR requires manual QA.
    - `No QA/E2E only`: PR does not require any manual QA effort. Prior to merging, ensure that you have successful end-to-end test runs in Bitrise. 
    - `Spot check on release build`: PR does not require feature QA but needs non-automated verification. In the description section, provide test scenarios. Add screenshots, and or recordings of what was tested.
5. Add `QA Passed` label when QA has signed off (Only required if the PR was labeled with `needs-qa`)

**Description**

_Write a short description of the changes included in this pull request, also include relevant motivation and context. Have in mind the following questions,_
_1. What is the reason for the change?_
_2. What is the improvement/solution?_

**Screenshots/Recordings**

_If applicable, add screenshots and/or recordings to visualize the before and after of your change_

**Issue**

fixes #???

**Checklist**

* [ ] There is a related GitHub issue
* [ ] Tests are included if applicable
* [ ] Any added code is fully documented
