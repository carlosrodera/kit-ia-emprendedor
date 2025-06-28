-- Rollback Migration: Remove Plans System
-- Version: 001
-- Date: 2025-01-28
-- Description: Rollback changes made by 001_add_plans_system.sql

-- ============================================
-- ROLLBACK IN REVERSE ORDER
-- ============================================

-- 1. Drop views
DROP VIEW IF EXISTS v_user_gpts_access CASCADE;

-- 2. Drop policies
DROP POLICY IF EXISTS "Users can view own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON users_profile;
DROP POLICY IF EXISTS "GPTs Lite are viewable by all" ON gpts_lite;
DROP POLICY IF EXISTS "GPTs Premium viewable by premium users" ON gpts_premium;
DROP POLICY IF EXISTS "Users can view own purchases" ON user_purchases;
DROP POLICY IF EXISTS "Users can view own unlocked GPTs" ON user_unlocked_gpts;
DROP POLICY IF EXISTS "Reviews are public to read" ON gpt_reviews;
DROP POLICY IF EXISTS "Users can create own reviews" ON gpt_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON gpt_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON gpt_reviews;

-- 3. Drop triggers
DROP TRIGGER IF EXISTS trigger_update_gpt_ratings ON gpt_reviews;
DROP TRIGGER IF EXISTS update_users_profile_updated_at ON users_profile;
DROP TRIGGER IF EXISTS update_gpts_lite_updated_at ON gpts_lite;
DROP TRIGGER IF EXISTS update_gpts_premium_updated_at ON gpts_premium;
DROP TRIGGER IF EXISTS update_user_purchases_updated_at ON user_purchases;
DROP TRIGGER IF EXISTS update_gpt_reviews_updated_at ON gpt_reviews;

-- 4. Drop functions
DROP FUNCTION IF EXISTS user_has_gpt_lite_access(UUID, UUID);
DROP FUNCTION IF EXISTS update_gpt_ratings();

-- 5. Drop indexes
DROP INDEX IF EXISTS idx_gpt_reviews_unique_premium;
DROP INDEX IF EXISTS idx_gpt_reviews_unique_lite;
DROP INDEX IF EXISTS idx_gpt_reviews_created;
DROP INDEX IF EXISTS idx_gpt_reviews_rating;
DROP INDEX IF EXISTS idx_gpt_reviews_premium;
DROP INDEX IF EXISTS idx_gpt_reviews_lite;
DROP INDEX IF EXISTS idx_gpt_reviews_user;

DROP INDEX IF EXISTS idx_user_unlocked_gpts_user;

DROP INDEX IF EXISTS idx_user_purchases_created;
DROP INDEX IF EXISTS idx_user_purchases_gpt_lite;
DROP INDEX IF EXISTS idx_user_purchases_status;
DROP INDEX IF EXISTS idx_user_purchases_type;
DROP INDEX IF EXISTS idx_user_purchases_user;

DROP INDEX IF EXISTS idx_gpts_premium_times_used;
DROP INDEX IF EXISTS idx_gpts_premium_exclusive;
DROP INDEX IF EXISTS idx_gpts_premium_featured;
DROP INDEX IF EXISTS idx_gpts_premium_active;
DROP INDEX IF EXISTS idx_gpts_premium_category;

DROP INDEX IF EXISTS idx_gpts_lite_times_purchased;
DROP INDEX IF EXISTS idx_gpts_lite_featured;
DROP INDEX IF EXISTS idx_gpts_lite_active;
DROP INDEX IF EXISTS idx_gpts_lite_category;

DROP INDEX IF EXISTS idx_users_profile_stripe_customer;
DROP INDEX IF EXISTS idx_users_profile_plan;
DROP INDEX IF EXISTS idx_users_profile_email;

-- 6. Drop tables
DROP TABLE IF EXISTS gpt_reviews CASCADE;
DROP TABLE IF EXISTS user_unlocked_gpts CASCADE;
DROP TABLE IF EXISTS user_purchases CASCADE;
DROP TABLE IF EXISTS gpts_premium CASCADE;
DROP TABLE IF EXISTS gpts_lite CASCADE;
DROP TABLE IF EXISTS users_profile CASCADE;

-- ============================================
-- End of rollback
-- ============================================