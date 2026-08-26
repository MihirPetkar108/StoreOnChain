-- Asset and quote metadata for ETH/USDC Sepolia payments.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS crypto_asset TEXT,
  ADD COLUMN IF NOT EXISTS crypto_network TEXT,
  ADD COLUMN IF NOT EXISTS crypto_amount TEXT;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_crypto_asset_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_crypto_asset_check
  CHECK (crypto_asset IS NULL OR crypto_asset IN ('ETH', 'USDC'));
