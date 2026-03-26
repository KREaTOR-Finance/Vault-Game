# Devnet Smoke Checklist (VaultCrack)

## Cluster
- Program: `DEDcYf8jXazXAQm9MjKqJu18X7RSa2MN4QqBzHZyoLqV`
- Devnet SKR test mint: `79iXs712Gt4VA7prim4EJkM7EnRr4wXgvwd1QCuAjuih`

## Vaults
- 3-digit (612): `BVUY6waUQ1LSKqgugXwVWXd9xhbihRM4pSp8r7ArmenW`
- 4-digit (1026): `CRJCpJJQCoqf8DWAreRDGEq41fT372hzkLwcrNbhXtjg`
- 6-digit (101101): `9bRsxXsG1srFp57uoNmpK4f5cXnFt8bezadcDwGtC2cc`
- Mega (05171026): `E5fom5Zu2kdci5mpP9VcaAP4gfs8qrRGNuK3BhqYsyDS`

## Alpha must-pass
1) Welcome screen forces connect (MWA)
2) After connect, MegaChallenge resolves and routes to Mega vault detail
3) Vault detail shows live values (no mocks)
4) Daily Free Try submits tx and returns result
5) Paid attempt submits tx and increases current fee
6) Fee split verified: vault fee ATA increases AND mega vault fee ATA increases
7) Correct attempt sets winner; app shows celebration; claim works immediately
8) Deep link: `vaultcrack://vault/<vaultPubkey>` forces connect → routes to Mega tutorial → then allows jump to linked vault
