# App layout review — 12 October 2026

Five pages are covered by Playwright at desktop (1440 × 1000) and mobile
(390 × 844) viewport sizes. Full-page screenshots are saved under ignored
`proofs/screenshots/pages/` using `<page>-<desktop|mobile>.png` names.

| Page     | Layout changes                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| Overview | Balanced agent/spending cards; separate full-width milestone section with top spacing; compact mobile spending facts |
| Account  | Separate owner and deployment cards; funding spans both columns; funding fields stack on mobile                      |
| Agent    | Balanced summary cards; full-width wallet and permissions sections; revocation inset; diagnostics collapsed below    |
| Activity | Timeline and empty state use the full content width                                                                  |
| Settings | Separate integration status and reporter cards; Cleanverse enrollment spans both columns with responsive form fields |

All ten screenshots were examined. That review identified and corrected missing
button styles, undefined logo layout classes, unnecessary summary-card stacking,
crowded integration status labels and overly tall mobile spending summaries.

The page suite checks navigation, active links, visible sections, collapsed
agent diagnostics, full-width funding/activity cards and horizontal overflow.
It runs alongside the existing authentication, legacy-link and mutation-boundary
checks. Screenshots use the explicitly unconfigured, unfunded browser fixture;
no payments, passkey creation or registration writes are performed by these tests.
The layout changes preserve the existing real signer and transaction handlers.

Run `npm run build`, then `npm run test:web` to reproduce the screenshots.

Final verification: **14 Playwright tests pass**, including ten page/viewport
checks. Strict TypeScript, production build and repository formatting lint pass.
Final screenshots for all five pages at both sizes were examined after fixes.
