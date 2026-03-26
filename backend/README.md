# VaultCrack Backend (Railway)

This folder contains the always-on backend for **VaultCrack**.

## Services

- `services/vault-api` – HTTP API used by the Android app
  - `GET /api/v1/vaults?cluster=devnet|mainnet`

- `services/vault-indexer` – long-running worker
  - Watches Solana program transactions
  - Upserts vault rows into Supabase `public.vaults`

## Required Supabase tables

You already created `public.vaults`. The indexer also uses a tiny cursor table for idempotent progress:

```sql
create table if not exists public.indexer_state (
  key text primary key,
  value text
);

alter table public.indexer_state enable row level security;
```

No public policies required for `indexer_state`.

## Environment variables (Railway)

Common:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

API:
- `PORT` (Railway provides)

Indexer:
- `PROGRAM_ID` (VaultCrack program id)
- `RPC_URL` (devnet/mainnet RPC)
- `CLUSTER` (`devnet` or `mainnet`)
- `POLL_MS` (optional)

## Local dev

From `backend/`:

```bash
npm i
npm run dev:api
npm run dev:indexer
```
