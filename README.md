# Whatever-you-need.-Someone-nearby-can-help.

A working cross-platform marketplace prototype for location-based, on-demand services.

## What is implemented

The repository now includes a shared Expo + React Native TypeScript app in `/app` that runs on:

- iOS
- Android
- Web

The implementation keeps one shared UI/data model for both the mobile app and the web experience.

### Customer experience

- landing page describing the platform
- choose a service category
- provide a location
- browse nearby providers
- request **Help Now**
- **Book for Later**
- track request status from pending to completion

### Provider experience

- switch into a provider workspace
- view incoming matching requests
- accept or decline jobs
- update job status from accepted → on the way/on job → completed
- manage availability
- view earnings and completed work totals

### Data model

- shared mock marketplace data for customers, providers, and service requests
- local in-memory state for an initial product prototype
- seeded providers and seeded incoming jobs so both customer and provider workflows can be demoed immediately

## Project structure

```text
README.md
app/
  App.tsx              # shared customer/provider experience
  src/
    mockData.ts        # seeded providers, categories, and requests
    types.ts           # shared marketplace data model
```

## Running the app

From the repository root:

```bash
cd /home/runner/work/Whatever-you-need.-Someone-nearby-can-help./Whatever-you-need.-Someone-nearby-can-help./app
npm install
npm run start
```

### Run the web version

```bash
npm run web
```

### Run the mobile version

```bash
npm run android
# or
npm run ios
```

## Validation used for this implementation

The shared app was validated with:

```bash
cd /home/runner/work/Whatever-you-need.-Someone-nearby-can-help./Whatever-you-need.-Someone-nearby-can-help./app
npx tsc --noEmit
CI=1 npx expo export --platform web
```

## Notes

- This initial implementation uses mock/local state instead of a backend.
- The web build and the mobile app share the same React Native/Expo codebase.
- The product concept from the original README is preserved and expanded into a working prototype.
