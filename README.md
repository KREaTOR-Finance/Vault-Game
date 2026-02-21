# Vault-Game (VaultCrack)

Mobile-first Solana vault cracking game (Matrix CRT UI).

## Monorepo layout
- `programs/vault_game` — Anchor program
- `app` — mobile web app (MWA)
- `referee` — feedback API (commitment-verified hints)
- `.secrets` — devnet keypairs (gitignored)

## Dev (high level)
1. Install Solana + Anchor
2. `solana config set --url devnet`
3. Build/deploy program
4. Run app + referee

(Setup scripts coming soon.)
