$programId = "7dEcm9oky2scx64qDAGEmRYgYovA5qr9qktmswdhTVN"
$wallet = "C:\Users\Buidl\.config\solana\clawd-dev-wallet.json"
$feeMint = "79iXs712Gt4VA7prim4EJkM7EnRr4wXgvwd1QCuAjuih"
$creatorFeeTokenAccount = "F83sohssidYbHpsvvyFx1Up6S9RUkcjWHboYSRjv3DGD"

# Create 3 user vaults + 1 Mega Challenge vault.
node scripts\devnet-create-vault-v1.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --pinLen 3 --prize 10000000 --baseFee 1 --feeStep 1
node scripts\devnet-create-vault-v1.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --pinLen 4 --prize 100000000 --baseFee 1 --feeStep 1
node scripts\devnet-create-vault-v1.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --pinLen 6 --prize 500000000 --baseFee 1 --feeStep 1

node scripts\devnet-create-vault-v1.js --programId $programId --wallet $wallet --feeMint $feeMint --creatorFeeTokenAccount $creatorFeeTokenAccount --pinLen 8 --prize 0 --baseFee 1 --feeStep 1 --setMega true
