# Recreate alpha vault set on devnet after program upgrade.
# Uses the funded clawd dev wallet.

$programId = "DEDcYf8jXazXAQm9MjKqJu18X7RSa2MN4QqBzHZyoLqV"
$wallet = "C:\Users\Buidl\.config\solana\clawd-dev-wallet.json"
$feeMint = "79iXs712Gt4VA7prim4EJkM7EnRr4wXgvwd1QCuAjuih"
$creatorFeeTokenAccount = "F83sohssidYbHpsvvyFx1Up6S9RUkcjWHboYSRjv3DGD"

# prizes in minor units (6 decimals)
node scripts\devnet-create-vault.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --secret 612 --pinLen 3 --baseFee 25 --prize 10000000
node scripts\devnet-create-vault.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --secret 1026 --pinLen 4 --baseFee 50 --prize 100000000
node scripts\devnet-create-vault.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --secret 101101 --pinLen 6 --baseFee 100 --prize 500000000

# Mega vault: set as mega challenge
node scripts\devnet-create-vault.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --secret 05171026 --pinLen 8 --baseFee 1000 --prize 0 --setMega true
