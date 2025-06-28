# Database Migrations - Kit IA Emprendedor

This directory contains SQL migrations for the Kit IA Emprendedor database schema on Supabase.

## 📁 Migration Files

### Current Migrations:

1. **001_add_plans_system.sql**
   - Adds the complete plan system (Free, Lite, Premium)
   - Creates tables: `users_profile`, `gpts_lite`, `gpts_premium`, `user_purchases`, `user_unlocked_gpts`, `gpt_reviews`
   - Implements RLS policies and access control functions
   - Includes rollback: `001_add_plans_system_rollback.sql`

2. **002_seed_plans_data.sql**
   - Seeds initial GPT Lite entries (10 GPTs at $4.99 each)
   - Seeds initial GPT Premium entries (10 exclusive GPTs)
   - Adds sample statistics and notifications

## 🚀 How to Run Migrations

### Option 1: Manual Execution (Recommended)

1. Go to Supabase SQL Editor: https://app.supabase.com/project/nktqqsbebhoedgookfzu/editor
2. Open each migration file in order
3. Copy the SQL content
4. Paste and execute in the SQL Editor

### Option 2: Using Migration Runner

```bash
# First, set your Supabase service role key
export SUPABASE_SERVICE_KEY="your-service-role-key"

# Run migrations
node run-migrations.js --execute
```

## 📊 Database Schema Overview

### Plan System Tables:

```sql
-- User profiles with plan information
users_profile
├── id (UUID, PK)
├── email
├── plan (free|lite|premium)
├── plan_started_at
├── plan_expires_at
├── trial_used
└── stripe_customer_id

-- GPTs available for individual purchase
gpts_lite
├── id (UUID, PK)
├── slug
├── name
├── description
├── unlock_price ($4.99)
├── times_purchased
└── average_rating

-- GPTs exclusive to Premium plan
gpts_premium
├── id (UUID, PK)
├── slug
├── name
├── description
├── premium_features[]
├── is_exclusive
└── support_level

-- Purchase history
user_purchases
├── id (UUID, PK)
├── user_id
├── purchase_type
├── amount
├── status
└── stripe_payment_intent_id

-- Unlocked GPTs per user
user_unlocked_gpts
├── user_id (FK)
├── gpt_lite_id (FK)
└── unlocked_at

-- Reviews and ratings
gpt_reviews
├── id (UUID, PK)
├── user_id
├── gpt_type (lite|premium)
├── rating (1-5)
└── comment
```

## 🔐 Access Control

The migrations implement Row Level Security (RLS) with these rules:

- **Free users**: Can view GPT Lite catalog but need to purchase to access
- **Lite users**: Same as free (Lite is for individual GPT purchases)
- **Premium users**: Full access to all GPT Lite + exclusive Premium GPTs

## 🛠️ Development Notes

- All migrations are idempotent (safe to run multiple times)
- Use `ON CONFLICT DO NOTHING` for seed data
- Always create a rollback file for schema changes
- Test migrations on a development database first

## 📝 Creating New Migrations

1. Create a new file: `XXX_description.sql` (increment number)
2. Add rollback file: `XXX_description_rollback.sql`
3. Include:
   - Header comments with version, date, description
   - Clear section separators
   - Idempotent operations
   - RLS policies if adding tables
   - Indexes for foreign keys

Example:
```sql
-- Migration: Add New Feature
-- Version: 003
-- Date: 2025-01-28
-- Description: Adds feature X to the system

-- Your SQL here...
```

## ⚠️ Important Supabase URLs

- Project: https://app.supabase.com/project/nktqqsbebhoedgookfzu
- SQL Editor: https://app.supabase.com/project/nktqqsbebhoedgookfzu/editor
- Table Editor: https://app.supabase.com/project/nktqqsbebhoedgookfzu/editor/tables
- API Settings: https://app.supabase.com/project/nktqqsbebhoedgookfzu/settings/api