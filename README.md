## ctbase - Cocktail Recipe Platform

A tablet-first Lightspeed POS–inspired surface for browsing, creating, editing, and deleting cocktail recipes. Cocktails are stored in Supabase, as are the reusable ingredient entries that fuel the autosuggest picker while composing new recipes.

### Project Structure

- `src/app/page.tsx` renders the entire experience through the `CocktailBoard` component.
- `src/components/CocktailBoard.tsx` contains the dashboard UI, CRUD flows, drawer, and modal form logic.
- `src/lib/supabase-client.ts` instantiates the browser Supabase client; credentials live in `.env.local`.
- `src/types/cocktail.ts` hosts the shared TypeScript shapes used by the dashboard.

### Required Supabase Tables

Create the following tables (or update your existing schema) before running the UI. All IDs can be UUIDs or bigints; match what you already use.

#### `ingredients`

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `name` | text | unique, case-insensitive (add a unique index on `lower(name)`) |

#### `cocktails`

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `name` | text | required |
| `description` | text | optional |
| `recipe` | text | optional |
| `image_url` | text | optional |
| `color` | text | optional hex string |
| `created_at` | timestamptz | default `now()` |

#### `cocktail_ingredients`

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `cocktail_id` | uuid | foreign key → `cocktails.id` (cascade delete recommended) |
| `ingredient_id` | uuid | foreign key → `ingredients.id` |
| `detail` | text | amount / prep notes |

> Every time you add ingredients inside the modal, the UI will reuse the existing ingredient row (via case-insensitive match) or create it on the fly before linking it to the cocktail through this join table.

### Environment

Copy `.env.local.example` (or update `.env.local`) with:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Only `NEXT_PUBLIC_` variables are referenced so the client bundle can talk to Supabase directly.

### Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` on a tablet or in a responsive browser viewport. The dashboard:

- syncs cocktails/ingredients from Supabase,
- lets you search by ingredient or drink,
- offers a manage mode where cards expose edit/delete controls,
- opens a POS-style drawer for the detail view,
- provides a full-screen modal to create or edit cocktails, complete with ingredient autosuggest and color presets.

### Deployment

Deploy straight to Vercel—no backend hosting is needed beyond Supabase. Make sure the same environment variables and table schema exist in your production project.
