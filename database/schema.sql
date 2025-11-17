-- =====================================================
-- Waitlist Magic Link Admin - Database Schema
-- =====================================================
-- This file contains the complete database schema for the waitlist and invite system.
-- Adapted for standalone use.
-- Run this in your Supabase SQL editor or via migration tools.
--
-- Note: Row Level Security (RLS) has been removed for simplicity.
-- Add RLS policies as needed for your multi-tenant requirements.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- =====================================================
-- Schemas
-- =====================================================
CREATE SCHEMA IF NOT EXISTS "core";
ALTER SCHEMA "core" OWNER TO "postgres";

CREATE SCHEMA IF NOT EXISTS "funcs";
ALTER SCHEMA "funcs" OWNER TO "postgres";

-- =====================================================
-- Functions
-- =====================================================

-- Function: consume_invite
-- Atomically consumes an invite link by validating and updating usage count
CREATE OR REPLACE FUNCTION "funcs"."consume_invite"("p_slug" "text", "p_token_hash" "text", "p_ua_hash" "text", "p_ip_prefix" "text")
RETURNS SETOF "core"."invites"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'core', 'funcs'
    AS $$BEGIN
  RETURN QUERY
  UPDATE core.invites
  SET used_at = now(),
      current_uses = current_uses + 1,
      used_ua_hash = p_ua_hash,
      used_ip_prefix = p_ip_prefix
  WHERE url_slug = p_slug
    AND token_hash = p_token_hash
    AND revoked = false
    AND expires_at > now()
    AND current_uses < max_uses
  RETURNING *;
END;$$;

ALTER FUNCTION "funcs"."consume_invite"("p_slug" "text", "p_token_hash" "text", "p_ua_hash" "text", "p_ip_prefix" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "funcs"."consume_invite" IS 'Atomically consumes an invite link by validating token, expiry, and usage limits, then incrementing usage count.';

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- =====================================================
-- Tables
-- =====================================================

-- Table: onboarding_types
-- Defines available onboarding workflow types for organizations
CREATE TABLE IF NOT EXISTS "core"."onboarding_types" (
    "onboarding_type_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "core"."onboarding_types" OWNER TO "postgres";

COMMENT ON TABLE "core"."onboarding_types" IS 'Available onboarding workflow types for organizations';
COMMENT ON COLUMN "core"."onboarding_types"."onboarding_type_id" IS 'Unique identifier for the onboarding type';
COMMENT ON COLUMN "core"."onboarding_types"."name" IS 'Name of the onboarding type (e.g., "standard", "enterprise")';

-- Table: organizations
-- Stores organization/tenant information
CREATE TABLE IF NOT EXISTS "core"."organizations" (
    "org_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "onboarding_type_id" "uuid",
    CONSTRAINT "slug_format" CHECK ((slug ~* '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "name_not_empty" CHECK ((char_length(name) > 0)),
    CONSTRAINT "slug_not_empty" CHECK ((char_length(slug) > 0))
);

ALTER TABLE "core"."organizations" OWNER TO "postgres";

COMMENT ON TABLE "core"."organizations" IS 'Organization/tenant information with settings and onboarding type';
COMMENT ON COLUMN "core"."organizations"."org_id" IS 'Unique identifier for the organization';
COMMENT ON COLUMN "core"."organizations"."name" IS 'Organization name';
COMMENT ON COLUMN "core"."organizations"."slug" IS 'URL-safe unique slug (lowercase, alphanumeric with hyphens)';
COMMENT ON COLUMN "core"."organizations"."settings" IS 'Organization-specific settings (JSONB)';
COMMENT ON COLUMN "core"."organizations"."onboarding_type_id" IS 'Associated onboarding workflow type';

-- Table: organizations_users
-- Stores user accounts and their organizational memberships
CREATE TABLE IF NOT EXISTS "core"."organizations_users" (
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "org_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "email" "text",
    "role_id" integer DEFAULT 2 NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "password_hash" "text",
    CONSTRAINT "valid_role_id" CHECK ("role_id" IN (1, 2))
);

ALTER TABLE "core"."organizations_users" OWNER TO "postgres";

COMMENT ON TABLE "core"."organizations_users" IS 'User accounts with organizational membership and authentication credentials';
COMMENT ON COLUMN "core"."organizations_users"."user_id" IS 'Unique identifier for the user';
COMMENT ON COLUMN "core"."organizations_users"."org_id" IS 'Organization this user belongs to';
COMMENT ON COLUMN "core"."organizations_users"."role_id" IS 'User role: 1 = admin, 2 = member';
COMMENT ON COLUMN "core"."organizations_users"."password_hash" IS 'Bcrypt hashed password for authentication';

-- Table: invites
-- Stores magic link invitations with usage tracking and security metadata
CREATE TABLE IF NOT EXISTS "core"."invites" (
    "invite_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "token_hash" "text" NOT NULL,
    "url_slug" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "max_uses" integer DEFAULT 1 NOT NULL,
    "current_uses" integer DEFAULT 0 NOT NULL,
    "revoked" boolean DEFAULT false NOT NULL,
    "purpose" "text" DEFAULT 'invite'::"text" NOT NULL,
    "sent_by_user_id" "uuid",
    "ua_hash" "text",
    "ip_prefix" "text",
    "used_at" timestamp with time zone,
    "used_ua_hash" "text",
    "used_ip_prefix" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "core"."invites" OWNER TO "postgres";

COMMENT ON TABLE "core"."invites" IS 'Magic link invitations with usage tracking and security metadata';
COMMENT ON COLUMN "core"."invites"."invite_id" IS 'Unique identifier for the invite';
COMMENT ON COLUMN "core"."invites"."token_hash" IS 'Hashed magic link token for validation';
COMMENT ON COLUMN "core"."invites"."url_slug" IS 'URL-safe slug for the invite link (unique)';
COMMENT ON COLUMN "core"."invites"."expires_at" IS 'Timestamp when the invite expires';
COMMENT ON COLUMN "core"."invites"."max_uses" IS 'Maximum number of times this invite can be used';
COMMENT ON COLUMN "core"."invites"."current_uses" IS 'Number of times this invite has been used';
COMMENT ON COLUMN "core"."invites"."revoked" IS 'Whether the invite has been manually revoked';
COMMENT ON COLUMN "core"."invites"."purpose" IS 'Purpose of the invite (e.g., "invite", "password-reset")';
COMMENT ON COLUMN "core"."invites"."sent_by_user_id" IS 'User who created this invite';
COMMENT ON COLUMN "core"."invites"."ua_hash" IS 'Hashed user agent from invite creation';
COMMENT ON COLUMN "core"."invites"."ip_prefix" IS 'IP prefix from invite creation (for security)';
COMMENT ON COLUMN "core"."invites"."used_at" IS 'Timestamp when the invite was used';
COMMENT ON COLUMN "core"."invites"."used_ua_hash" IS 'Hashed user agent from invite usage';
COMMENT ON COLUMN "core"."invites"."used_ip_prefix" IS 'IP prefix from invite usage';

-- Table: waitlist
-- Stores waitlist registration submissions
CREATE TABLE IF NOT EXISTS "core"."waitlist" (
    "waitlist_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text" NOT NULL,
    "organization_name" "text",
    "job_title" "text",
    "interest_reason" "text",
    "use_case" "text",
    "feedback_importance" integer,
    "subscribe_newsletter" boolean DEFAULT false,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invite_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_status" CHECK ((status = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "valid_feedback_score" CHECK (((feedback_importance >= 1) AND (feedback_importance <= 10)))
);

ALTER TABLE "core"."waitlist" OWNER TO "postgres";

COMMENT ON TABLE "core"."waitlist" IS 'Waitlist registration submissions with approval workflow';
COMMENT ON COLUMN "core"."waitlist"."waitlist_id" IS 'Unique identifier for the waitlist entry';
COMMENT ON COLUMN "core"."waitlist"."email" IS 'Email address (unique, case-insensitive)';
COMMENT ON COLUMN "core"."waitlist"."status" IS 'Status: pending, approved, or rejected';
COMMENT ON COLUMN "core"."waitlist"."feedback_importance" IS 'User-rated importance (1-10 scale)';
COMMENT ON COLUMN "core"."waitlist"."invite_id" IS 'Associated invite ID after approval';

-- =====================================================
-- Primary Keys
-- =====================================================
ALTER TABLE ONLY "core"."onboarding_types"
    ADD CONSTRAINT "onboarding_types_pkey" PRIMARY KEY ("onboarding_type_id");

ALTER TABLE ONLY "core"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("org_id");

ALTER TABLE ONLY "core"."organizations_users"
    ADD CONSTRAINT "organizations_users_pkey" PRIMARY KEY ("user_id");

ALTER TABLE ONLY "core"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("invite_id");

ALTER TABLE ONLY "core"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("waitlist_id");

-- =====================================================
-- Unique Constraints
-- =====================================================
ALTER TABLE ONLY "core"."organizations"
    ADD CONSTRAINT "organizations_slug_unique" UNIQUE ("slug");

ALTER TABLE ONLY "core"."invites"
    ADD CONSTRAINT "invites_url_slug_unique" UNIQUE ("url_slug");

-- =====================================================
-- Indexes
-- =====================================================

-- organizations indexes
CREATE INDEX "idx_organizations_slug" ON "core"."organizations" USING "btree" ("slug");

CREATE INDEX "idx_organizations_created_at" ON "core"."organizations" USING "btree" ("created_at" DESC);

CREATE INDEX "idx_organizations_onboarding_type" ON "core"."organizations" USING "btree" ("onboarding_type_id");

-- organizations_users indexes
CREATE INDEX "idx_organizations_users_org_id" ON "core"."organizations_users" USING "btree" ("org_id");

CREATE INDEX "idx_organizations_users_created_at" ON "core"."organizations_users" USING "btree" ("created_at" DESC);

CREATE UNIQUE INDEX "idx_organizations_users_email_org" ON "core"."organizations_users" USING "btree" ("org_id", LOWER("email"));

CREATE INDEX "idx_organizations_users_email" ON "core"."organizations_users" USING "btree" (LOWER("email"));

CREATE INDEX "idx_organizations_users_role_id" ON "core"."organizations_users" USING "btree" ("role_id");

CREATE INDEX "idx_organizations_users_first_name" ON "core"."organizations_users" USING "btree" ("first_name");

CREATE INDEX "idx_organizations_users_last_name" ON "core"."organizations_users" USING "btree" ("last_name");

CREATE INDEX "idx_organizations_users_email_password" ON "core"."organizations_users" USING "btree" ("email", "password_hash") WHERE ("password_hash" IS NOT NULL);

-- invites indexes
CREATE INDEX "idx_invites_url_slug" ON "core"."invites" USING "btree" ("url_slug");

CREATE INDEX "idx_invites_token_hash" ON "core"."invites" USING "btree" ("token_hash");

CREATE INDEX "idx_invites_email" ON "core"."invites" USING "btree" (LOWER("email"));

CREATE INDEX "idx_invites_sent_by" ON "core"."invites" USING "btree" ("sent_by_user_id");

CREATE INDEX "idx_invites_expires_at" ON "core"."invites" USING "btree" ("expires_at");

CREATE INDEX "idx_invites_status" ON "core"."invites" USING "btree" ("revoked", "used_at", "expires_at");

-- waitlist indexes
CREATE UNIQUE INDEX IF NOT EXISTS "idx_waitlist_email_unique"
    ON "core"."waitlist" USING "btree" (LOWER("email"));

CREATE INDEX IF NOT EXISTS "idx_waitlist_status"
    ON "core"."waitlist" USING "btree" ("status");

CREATE INDEX IF NOT EXISTS "idx_waitlist_created_at"
    ON "core"."waitlist" USING "btree" ("created_at" DESC);

-- =====================================================
-- Foreign Keys
-- =====================================================
ALTER TABLE ONLY "core"."organizations"
    ADD CONSTRAINT "organizations_onboarding_type_id_fkey" FOREIGN KEY ("onboarding_type_id") REFERENCES "core"."onboarding_types"("onboarding_type_id");

ALTER TABLE ONLY "core"."organizations_users"
    ADD CONSTRAINT "organizations_users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "core"."organizations"("org_id") ON DELETE CASCADE;

ALTER TABLE ONLY "core"."invites"
    ADD CONSTRAINT "invites_sent_by_user_id_fkey" FOREIGN KEY ("sent_by_user_id") REFERENCES "core"."organizations_users"("user_id") ON DELETE SET NULL;

ALTER TABLE ONLY "core"."waitlist"
    ADD CONSTRAINT "waitlist_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "core"."invites"("invite_id") ON DELETE SET NULL;

-- =====================================================
-- Permissions
-- =====================================================

GRANT USAGE ON SCHEMA "core" TO "service_role";
GRANT USAGE ON SCHEMA "funcs" TO "service_role";

-- Function permissions
GRANT ALL ON FUNCTION "funcs"."consume_invite"("p_slug" "text", "p_token_hash" "text", "p_ua_hash" "text", "p_ip_prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "funcs"."consume_invite"("p_slug" "text", "p_token_hash" "text", "p_ua_hash" "text", "p_ip_prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "funcs"."consume_invite"("p_slug" "text", "p_token_hash" "text", "p_ua_hash" "text", "p_ip_prefix" "text") TO "service_role";

-- Table permissions
GRANT ALL ON TABLE "core"."onboarding_types" TO "anon";
GRANT ALL ON TABLE "core"."onboarding_types" TO "authenticated";
GRANT ALL ON TABLE "core"."onboarding_types" TO "service_role";

GRANT ALL ON TABLE "core"."organizations" TO "anon";
GRANT ALL ON TABLE "core"."organizations" TO "authenticated";
GRANT ALL ON TABLE "core"."organizations" TO "service_role";

GRANT ALL ON TABLE "core"."organizations_users" TO "anon";
GRANT ALL ON TABLE "core"."organizations_users" TO "authenticated";
GRANT ALL ON TABLE "core"."organizations_users" TO "service_role";

GRANT ALL ON TABLE "core"."invites" TO "anon";
GRANT ALL ON TABLE "core"."invites" TO "authenticated";
GRANT ALL ON TABLE "core"."invites" TO "service_role";

GRANT ALL ON TABLE "core"."waitlist" TO "anon";
GRANT ALL ON TABLE "core"."waitlist" TO "authenticated";
GRANT ALL ON TABLE "core"."waitlist" TO "service_role";

-- =====================================================
-- End of Schema
-- =====================================================
