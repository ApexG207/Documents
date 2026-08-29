# Security scanning policy

matIQ's required commercial quality gate runs on every pull request and release branch. It includes locked dependency installation, production dependency auditing, ESLint, strict TypeScript checking, a production build, release-control tests, and a commit-bound evidence manifest.

## CodeQL evidence

CodeQL runs for GitHub Actions and JavaScript/TypeScript on pull requests, pushes to `main`, manual requests, and the weekly schedule. Because GitHub code scanning is not currently enabled for this private repository, results are retained for 30 days as SARIF workflow artifacts instead of being uploaded to the Code Scanning service.

When GitHub Advanced Security/code scanning is enabled:

1. change the analyze action's `upload` value from `never` to `always`;
2. add `security-events: write` to workflow permissions;
3. make both CodeQL jobs required before production merge.

Add Swift to the matrix only after the iOS scaffold has a buildable Xcode project and an explicit build command. A scanner that cannot build or retain results is not counted as a passed control.
