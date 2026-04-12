ALTER TABLE "user"
ADD COLUMN "deleted_at" timestamp with time zone,
ADD COLUMN "anonymized_at" timestamp with time zone,
ADD COLUMN "deletion_reason" text;
