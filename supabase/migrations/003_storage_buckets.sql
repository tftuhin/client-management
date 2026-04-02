-- ============================================================
-- 003_storage_buckets.sql
-- Storage bucket creation and policies
-- ============================================================

-- ============================================================
-- BUCKETS
-- ============================================================

-- Documents bucket — for client documents uploaded by staff
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Avatars bucket — for staff and client avatar images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Agreement PDFs bucket — for generated/signed agreement PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agreements',
  'agreements',
  false,
  20971520, -- 20 MB
  ARRAY[
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Invoice PDFs bucket — for generated invoice PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Firm assets bucket — for firm logo and branding assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'firm-assets',
  'firm-assets',
  true,
  5242880, -- 5 MB
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

-- ---- documents bucket ----

CREATE POLICY "documents_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (SELECT is_staff())
  );

CREATE POLICY "documents_read" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (SELECT is_staff())
  );

CREATE POLICY "documents_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (SELECT is_staff())
  );

-- ---- avatars bucket (public bucket, authenticated upload) ----

CREATE POLICY "avatars_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (SELECT is_staff())
  );

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (SELECT is_staff())
  );

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (SELECT is_staff())
  );

-- Public read for avatars (no policy needed for public buckets, but explicit is safer)
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- ---- agreements bucket ----

CREATE POLICY "agreements_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'agreements'
    AND (SELECT is_staff())
  );

CREATE POLICY "agreements_read" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'agreements'
    AND (SELECT is_staff())
  );

CREATE POLICY "agreements_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'agreements'
    AND (SELECT is_admin())
  );

-- ---- invoices bucket ----

CREATE POLICY "invoices_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'invoices'
    AND (SELECT is_staff())
  );

CREATE POLICY "invoices_read" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (SELECT is_staff())
  );

CREATE POLICY "invoices_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (SELECT is_admin())
  );

-- ---- firm-assets bucket ----

CREATE POLICY "firm_assets_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'firm-assets'
    AND (SELECT is_owner())
  );

CREATE POLICY "firm_assets_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'firm-assets'
    AND (SELECT is_owner())
  );

CREATE POLICY "firm_assets_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'firm-assets'
    AND (SELECT is_owner())
  );

CREATE POLICY "firm_assets_public_read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'firm-assets');
