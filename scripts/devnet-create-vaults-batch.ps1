# Creates 3 test vaults (3/4/6 digit) + Mega (8 digit) on devnet for the new program.
# Uses the devnet test mint as SKR.

$programId = "DEDcYf8jXazXAQm9MjKqJu18X7RSa2MN4QqBzHZyoLqV"
$wallet = "C:\Users\Buidl\.config\solana\clawd-dev-wallet.json"
$feeMint = "79iXs712Gt4VA7prim4EJkM7EnRr4wXgvwd1QCuAjuih"
$creatorFeeTokenAccount = "F83sohssidYbHpsvvyFx1Up6S9RUkcjWHboYSRjv3DGD"

# Prizes are in smallest units (mint has 6 decimals)
# small  =  10.000000
# medium = 100.000000
# large  = 500.000000

node scripts\devnet-create-vault.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --secret 612 --pinLen 3 --baseFee 25 --prize 10000000
node scripts\devnet-create-vault.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --secret 1026 --pinLen 4 --baseFee 50 --prize 100000000
node scripts\devnet-create-vault.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --secret 101101 --pinLen 6 --baseFee 100 --prize 500000000

# Mega vault: set as mega challenge
node scripts\devnet-create-vault.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --secret 05171026 --pinLen 8 --baseFee 1000 --prize 0 --setMega true
