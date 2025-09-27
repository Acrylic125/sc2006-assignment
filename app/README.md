# Web App

## Pre-requsite
**NOTE:** File paths are relative to this `/app` folder.

Make sure to have the following installed:
1. [NodeJS and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
1. Install [pnpm](https://pnpm.io/installation) (It's essentially `npm` but faster).
1. Check if you have git installed, if not, install [git](https://git-scm.com/downloads) 
1. Make sure to link your Github account to your local git installation. See [here](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
1. Clone this repository by running `git clone git@github.com:Acrylic125/sc2006-assignment.git`.

## Setup
1. Copy `./.example.env` and paste it in a new file `./.env`.
1. Run `pnpm i` to install the dependencies. Make sure you are in this working directory in your CLI.
1. Setup `./.env`. If you are missing some parts of `.env`, see below.
```shell
# See Clerk ENV Setup
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# See Supabase ENV Setup
DATABASE_URL=

# See Mapbox ENV Setup
NEXT_PUBLIC_MAPBOX_PK=pk...
```

### Clerk ENV Setup
1. Setup a [Clek](https://clerk.com/)
1. Go [here](https://dashboard.clerk.com/apps), create a **Clerk Application**. You should be redirected to a guide. 
1. Under `Set your Clerk API keys`, Copy the environment variables, and paste it in `./.env`.

### Supabase ENV Setup
1. Setup a [Supabase](https://supabase.com/) account.
1. Create a **Supabase Project**, and at the top of the dashboard, click `Connect`. 
1. Select `ORMs`, and select `Drizzle`.
1. Copy `DATABASE_URL="postgresql:` labelled `# Connect to Supabase via connection pooling`. 
1. Paste it in your `./.env`.

### Mapbox ENV Setup
1. Setup a [Mapbox](https://www.mapbox.com/) account. 
1. Go [here](https://console.mapbox.com/account/access-tokens/).
1. You should have a **Default public token**, if not create a new one. Copy this. 
1. Go to `./.env` and replace `NEXT_PUBLIC_MAPBOX_PK=pk...` with `NEXT_PUBLIC_MAPBOX_PK=YOUR_PUBLIC_KEY_HERE`.

## Development Guide

### UI / Boundary
- UI **Components** in the `./src/components` folder.
- UI **Pages** in `./src/app/.../page.tsx`.
- **In both Components and Pages, MAKE SURE THE FIRST LINE OF THE FILE IS `"use client";` See [Use Client Directive](https://nextjs.org/docs/app/api-reference/directives/use-client). You can also read up on [Server Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) to see when to / not to use this directive.
- Use prebuilt components wherever possible. Refer to [Shadcn UI](https://ui.shadcn.com/docs/components) for component library.
- Use [Tailwind](https://tailwindcss.com/docs/styling-with-utility-classes) for styling

### Backend / Controller
- ...

### DB / Entity
- We are using an `Drizzle ORM` to simplify database interaction. Think of it as the `Repository`.
- DB **entities/models** in `./src/db/schema.ts`.
