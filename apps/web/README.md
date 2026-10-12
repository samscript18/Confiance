# Confiance web application

Next.js 16.4.0 / React 19.3.0, strict TypeScript. Run `npm run dev` from the root
and use http://localhost:3000. Root .env config is loaded server-side. Missing
configuration is shown honestly; no mock payment/balance/session appears.

Mera owns setup/revocation. Privy signs agent execution. The server authenticates
owner dashboard mutations with single-use signed challenges and strict-origin
cookies, checks onchain ownership and serializes payment operations.

See ../../docs/SETUP.md for actual onboarding, deployment and provider setup.
Automated Playwright tests include mobile layout and owner authentication/replay.
Run `npm run build` before `npm run test:web`: tests start a production server on
port 3021 with isolated fixture configuration and no provider credentials.
They use unfunded fixtures and prove no physical authenticator ceremony.
Generated route declarations are imported through next-env.d.ts; the .next folder
is excluded from broad source globbing to avoid loading both development and
production copies of the same Next global route declarations.
