-- Crypto payment metadata for the existing payments table.
-- Safe to run against an existing Supabase project.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS chain_id TEXT,
  ADD COLUMN IF NOT EXISTS token_address TEXT,
  ADD COLUMN IF NOT EXISTS escrow_contract_address TEXT,
  ADD COLUMN IF NOT EXISTS deposit_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS release_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS refund_tx_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payments_crypto_deposit_tx_hash_idx
  ON payments (deposit_tx_hash)
  WHERE deposit_tx_hash IS NOT NULL;
