# Vault-Game Android (Kotlin/Compose)

Primary client for Vault-Game (Sigma skin). Web (`/frontend`) remains as a fallback.

## Folder
- `android/` — Android Studio project
  - `app/` — single-activity Compose app

## Prereqs
- Android Studio (latest stable)
- JDK 17 (Android Studio bundles one)

## Run
From Android Studio:
1. Open the `android/` folder
2. Let Gradle sync
3. Select a build variant:
   - `devnetDebug` (default for testing)
   - `mainnetRelease` / `mainnetDebug` (when mainnet program is deployed)
4. Run the `app` configuration on an emulator or device

CLI (requires Java in PATH):
```bash
cd android
./gradlew :app:assembleDebug
```

## Architecture conventions
- UI: `ui/screens/*` (screen composables + UiState)
- Navigation: `ui/nav/*`
- Shared components: `ui/components/*`
- Theme: `ui/theme/*` (Sigma dark CRT)
- Data models: `data/model/*`
- Repositories: `data/repo/*`
  - Currently mocked (no Solana calls yet)

## Patterns
- Each screen has a ViewModel exposing `StateFlow<UiState>`
- Tx UX uses a shared overlay component (`TxStatusOverlay`) to standardize: build → sign → send → confirm
- Winner identity is a first-class UI element (`WinnerBadge`) to show “Cracked by …” across feed/detail/dashboard.

## Next integration steps (planned)
- Mobile Wallet Adapter (MWA): connect/disconnect, signing, session restore
- Solana RPC reads: global state, vault feed, vault detail, mega vault stats
- SKR swap gate: deep link to wallet/Jupiter
- On-chain writes: create/attempt/free-try/claim/reclaim/rewards, for both SKR + SOL vaults
