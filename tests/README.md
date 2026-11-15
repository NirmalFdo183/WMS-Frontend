# Frontend automated tests (section 7.3)

Verified on 15 November 2026: E-01 through E-09 passed in Chromium, Firefox, and
WebKit (27 executions). The three existing starter tests also passed in all
three browsers. The complete run reported **36 passed**, with no failures.

Run these commands in **WMS-Frontend**, which contains `package.json` and
`playwright.config.ts`. Install Node.js first if `node` and `npm` are unavailable.
The examples use `npm.cmd` and `npx.cmd` for reliable argument forwarding in
Windows PowerShell. On macOS/Linux, use `npm` and `npx` instead.

## Install once

```powershell
npm.cmd ci
npx.cmd playwright install
```

On Linux CI, use `npx playwright install --with-deps` to install browser system
dependencies too. The existing GitHub Actions workflow already does this.

## Run your nine test cases

```powershell
npm.cmd run test:e2e -- tests/warehouse.spec.ts --project=chromium
```

Playwright starts Vite automatically at `http://127.0.0.1:5174` and stops it when
the run finishes. Leave port 5174 free. Your normal frontend can continue on
port 5173. There is no need to start Laravel, create a database, or uncomment
users in `WMS-Backend/database/seeders/DatabaseSeeder.php` for this mocked suite.

To watch the browser, select individual cases, or run across browsers:

```powershell
# Visible Chrome/Chromium browser
npm.cmd run test:e2e -- tests/warehouse.spec.ts --project=chromium --headed

# Interactive test runner: select a case, run it, and inspect each step
npm.cmd run test:e2e -- tests/warehouse.spec.ts --project=chromium --ui

# Only E-07
npm.cmd run test:e2e -- tests/warehouse.spec.ts --project=chromium --grep "E-07"

# All nine cases in Chromium, Firefox, and WebKit (27 executions)
npm.cmd run test:e2e -- tests/warehouse.spec.ts

# Everything, including the three pre-existing starter tests
npm.cmd run test:e2e
```

## Cases and checks

| ID | Case | What the test verifies |
| --- | --- | --- |
| E-01 | Unauthenticated redirect | `/dashboard` redirects to `/login`; the dashboard is hidden. |
| E-02 | Empty-field validation | Both field errors appear, username receives focus, and no login request is sent. |
| E-03 | Wrong credentials | `/api/login` returns 401; the error appears, URL remains `/login`, and no token is saved. |
| E-04 | Admin login | The form submits username/password and accepts a mocked token/user; Warehouse Dashboard opens. |
| E-05 | Dashboard header and cards | Heading, welcome message, signed-in user, warehouse value, and all four metric labels are visible. |
| E-06 | Recent dispatches | The Recent dispatches section lists LD-0101 and LD-0102 with their routes, trucks, and statuses. |
| E-07 | Open dispatch details | Clicking LD-0101 opens the loading tab and its detail popup, including product and quantity; the popup closes. |
| E-08 | Loading tab lists manifests | Opening `/supply-invoices?tab=loading` shows both manifest rows. |
| E-09 | Manifest load error | `/api/loadings` returns 500; `Failed to load manifests from server.` appears and no manifest rows appear. |

The IDs appear in the terminal and HTML report. Record **Passed** in your project
report only after the corresponding test passes; record the browser and run date
with your results.

## View results and diagnose failures

```powershell
npx.cmd playwright show-report
```

The HTML report is written to `playwright-report/`. Failed tests also save
screenshots and traces under `test-results/`; open the failed test in the HTML
report to inspect them. These generated folders are already ignored by Git.
The GitHub Actions workflow uploads the HTML report as an artifact.

If a browser executable is missing, run `npx.cmd playwright install`. If port 5174 is
occupied, stop the process using it before rerunning. Avoid running two copies of
this suite at once because both need the same test server port.

## How mocks work

`tests/fixtures/warehouse.ts` supplies an admin, two manifests, and explicit API
responses using Playwright's `page.route()` and `route.fulfill()`. Unknown API
requests fail the test so missing mocks cannot silently reach a real backend.
The test server overrides `VITE_API_BASE_URL` to its own `/api` path, independent
of your regular `.env`. Each test gets its own isolated browser context.

E-01 through E-04 start signed out. E-04 signs in through the real form using
`test_admin` / `mock-password`; the response is mocked, so those credentials do
not need to exist in the database. E-05 through E-09 use the `adminPage` fixture
to insert a mock session into local storage before navigation, and `/api/user`
is mocked so the app's session refresh succeeds. E-03 and E-09 override one
response to exercise their error paths.

These tests validate frontend behavior against controlled responses. They do
not verify Laravel authentication, database contents, backend permissions, or
frontend/backend integration. Test those separately against a dedicated test
database using real API calls and test accounts; do not assume that passing
mocked login proves the seeded passwords work.

References: [Playwright API mocking](https://playwright.dev/docs/mock),
[automatic web server](https://playwright.dev/docs/test-webserver).
