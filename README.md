# Whatever You Need

Whatever You Need is a responsive on-demand services platform for customers and providers. It is implemented as a React + Vite application that works as a web app and mobile-friendly installable experience through the browser.

## Features

### Customer experience

- landing page with the platform overview
- choose a service category
- provide a location
- view nearby providers
- request **Help Now**
- schedule **Book for Later**
- track request status locally in the app

### Provider experience

- register under any supported category
- switch between provider profiles
- review incoming service requests
- accept or decline pending work
- update job progress from accepted to in-progress to completed
- view availability, open jobs, completed jobs, and estimated earnings

### Supported service categories

- plumbers
- electricians
- cleaning
- gardening
- household/care services
- roadside assistance
- jump starts
- batteries
- tyre changes
- towing
- locksmith services

## Tech stack

- React 19
- TypeScript
- Vite
- Vitest

The app uses mocked provider data plus `localStorage` persistence so the flows are demonstrable now while keeping the code easy to connect to a backend later.

## Run locally

From the repository root:

```bash
npm install
npm run dev
```

Then open the local Vite URL in your browser.

## Run tests

```bash
npm test
```

## Build the web/downloadable version

```bash
npm run build
```

The production-ready web bundle is generated in `dist/`. You can preview it locally with:

```bash
npm run preview
```

Because the app includes a web manifest and responsive layout, it can also be installed from a modern mobile browser as an app-like experience.

## Project structure

```text
src/
  App.tsx              # customer + provider UI
  lib/platform.ts      # service categories, mocked data, request helpers
  lib/platform.test.ts # core flow tests
```

## Notes

- No backend is required for the initial preview.
- Requests and provider registrations persist in the browser only.
- The architecture is intentionally simple so a future API layer can replace the local state and helper module cleanly.
