-- Add LinkedIn and VAT ID to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS vat_id text;
