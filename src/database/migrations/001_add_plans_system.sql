-- Migration: Add Plans System to Kit IA Emprendedor
-- Version: 001
-- Date: 2025-01-28
-- Description: Add user plans, GPT tiers, and purchase tracking

-- ============================================
-- 1. MODIFY USERS TABLE (Add plan information)
-- ============================================

-- Add plan columns to auth.users metadata
-- Note: In Supabase, we use raw_user_meta_data in auth.users
-- We'll create a custom users_profile table for additional data

CREATE TABLE IF NOT EXISTS public.users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'lite', 'premium')),
  plan_started_at TIMESTAMPTZ DEFAULT NOW(),
  plan_expires_at TIMESTAMPTZ,
  trial_used BOOLEAN DEFAULT false,
  trial_started_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_users_profile_email ON users_profile(email);
CREATE INDEX idx_users_profile_plan ON users_profile(plan);
CREATE INDEX idx_users_profile_stripe_customer ON users_profile(stripe_customer_id);

-- ============================================
-- 2. CREATE GPTS_LITE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.gpts_lite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  chat_link TEXT NOT NULL,
  icon_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  -- Lite specific fields
  unlock_price DECIMAL(10,2) DEFAULT 4.99,
  original_price DECIMAL(10,2) DEFAULT 9.99,
  discount_percentage INTEGER DEFAULT 50,
  times_purchased INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_gpts_lite_category ON gpts_lite(category_id);
CREATE INDEX idx_gpts_lite_active ON gpts_lite(is_active);
CREATE INDEX idx_gpts_lite_featured ON gpts_lite(is_featured);
CREATE INDEX idx_gpts_lite_times_purchased ON gpts_lite(times_purchased DESC);

-- ============================================
-- 3. CREATE GPTS_PREMIUM TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.gpts_premium (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  chat_link TEXT NOT NULL,
  icon_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_exclusive BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  -- Premium specific fields
  premium_features TEXT[] DEFAULT '{}',
  demo_link TEXT,
  tutorial_link TEXT,
  support_level TEXT DEFAULT 'priority' CHECK (support_level IN ('standard', 'priority', 'dedicated')),
  update_frequency TEXT DEFAULT 'weekly' CHECK (update_frequency IN ('daily', 'weekly', 'monthly')),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  times_used INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_gpts_premium_category ON gpts_premium(category_id);
CREATE INDEX idx_gpts_premium_active ON gpts_premium(is_active);
CREATE INDEX idx_gpts_premium_featured ON gpts_premium(is_featured);
CREATE INDEX idx_gpts_premium_exclusive ON gpts_premium(is_exclusive);
CREATE INDEX idx_gpts_premium_times_used ON gpts_premium(times_used DESC);

-- ============================================
-- 4. CREATE USER_PURCHASES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('gpt_lite', 'plan_lite', 'plan_premium')),
  -- Item details (NULL for plan purchases)
  gpt_lite_id UUID REFERENCES gpts_lite(id) ON DELETE SET NULL,
  gpt_name TEXT, -- Store name in case GPT is deleted
  -- Purchase details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  payment_method TEXT CHECK (payment_method IN ('card', 'paypal', 'trial', 'promo')),
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  completed_at TIMESTAMPTZ,
  -- Additional info
  promo_code TEXT,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_purchases_user ON user_purchases(user_id);
CREATE INDEX idx_user_purchases_type ON user_purchases(purchase_type);
CREATE INDEX idx_user_purchases_status ON user_purchases(status);
CREATE INDEX idx_user_purchases_gpt_lite ON user_purchases(gpt_lite_id);
CREATE INDEX idx_user_purchases_created ON user_purchases(created_at DESC);

-- ============================================
-- 5. CREATE USER_UNLOCKED_GPTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_unlocked_gpts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gpt_lite_id UUID NOT NULL REFERENCES gpts_lite(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  purchase_id UUID REFERENCES user_purchases(id),
  expires_at TIMESTAMPTZ, -- For future use if we add expiring unlocks
  PRIMARY KEY (user_id, gpt_lite_id)
);

-- Create index
CREATE INDEX idx_user_unlocked_gpts_user ON user_unlocked_gpts(user_id);

-- ============================================
-- 6. CREATE GPT_REVIEWS TABLE (for both lite and premium)
-- ============================================

CREATE TABLE IF NOT EXISTS public.gpt_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gpt_type TEXT NOT NULL CHECK (gpt_type IN ('lite', 'premium')),
  gpt_lite_id UUID REFERENCES gpts_lite(id) ON DELETE CASCADE,
  gpt_premium_id UUID REFERENCES gpts_premium(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure only one GPT reference is set
  CONSTRAINT only_one_gpt_reference CHECK (
    (gpt_lite_id IS NOT NULL AND gpt_premium_id IS NULL) OR
    (gpt_lite_id IS NULL AND gpt_premium_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_gpt_reviews_user ON gpt_reviews(user_id);
CREATE INDEX idx_gpt_reviews_lite ON gpt_reviews(gpt_lite_id);
CREATE INDEX idx_gpt_reviews_premium ON gpt_reviews(gpt_premium_id);
CREATE INDEX idx_gpt_reviews_rating ON gpt_reviews(rating);
CREATE INDEX idx_gpt_reviews_created ON gpt_reviews(created_at DESC);

-- Unique constraint to prevent multiple reviews
CREATE UNIQUE INDEX idx_gpt_reviews_unique_lite ON gpt_reviews(user_id, gpt_lite_id) WHERE gpt_lite_id IS NOT NULL;
CREATE UNIQUE INDEX idx_gpt_reviews_unique_premium ON gpt_reviews(user_id, gpt_premium_id) WHERE gpt_premium_id IS NOT NULL;

-- ============================================
-- 7. CREATE TRIGGERS
-- ============================================

-- Update updated_at timestamps
CREATE TRIGGER update_users_profile_updated_at BEFORE UPDATE ON users_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gpts_lite_updated_at BEFORE UPDATE ON gpts_lite
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gpts_premium_updated_at BEFORE UPDATE ON gpts_premium
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_purchases_updated_at BEFORE UPDATE ON user_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gpt_reviews_updated_at BEFORE UPDATE ON gpt_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. CREATE FUNCTIONS
-- ============================================

-- Function to check if user has access to a GPT Lite
CREATE OR REPLACE FUNCTION user_has_gpt_lite_access(p_user_id UUID, p_gpt_lite_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_plan TEXT;
  v_has_unlock BOOLEAN;
BEGIN
  -- Get user plan
  SELECT plan INTO v_user_plan
  FROM users_profile
  WHERE id = p_user_id;
  
  -- Premium users have access to all GPT Lite
  IF v_user_plan = 'premium' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has unlocked this specific GPT
  SELECT EXISTS(
    SELECT 1 FROM user_unlocked_gpts
    WHERE user_id = p_user_id 
    AND gpt_lite_id = p_gpt_lite_id
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_has_unlock;
  
  RETURN v_has_unlock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update GPT ratings after a review
CREATE OR REPLACE FUNCTION update_gpt_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.gpt_type = 'lite' AND NEW.gpt_lite_id IS NOT NULL THEN
    UPDATE gpts_lite
    SET 
      average_rating = (
        SELECT AVG(rating)::DECIMAL(3,2)
        FROM gpt_reviews
        WHERE gpt_lite_id = NEW.gpt_lite_id
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM gpt_reviews
        WHERE gpt_lite_id = NEW.gpt_lite_id
      )
    WHERE id = NEW.gpt_lite_id;
  ELSIF NEW.gpt_type = 'premium' AND NEW.gpt_premium_id IS NOT NULL THEN
    UPDATE gpts_premium
    SET 
      average_rating = (
        SELECT AVG(rating)::DECIMAL(3,2)
        FROM gpt_reviews
        WHERE gpt_premium_id = NEW.gpt_premium_id
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM gpt_reviews
        WHERE gpt_premium_id = NEW.gpt_premium_id
      )
    WHERE id = NEW.gpt_premium_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gpt_ratings
AFTER INSERT OR UPDATE OR DELETE ON gpt_reviews
FOR EACH ROW EXECUTE FUNCTION update_gpt_ratings();

-- ============================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpts_lite ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpts_premium ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocked_gpts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpt_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. CREATE RLS POLICIES
-- ============================================

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users_profile
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users_profile
  FOR UPDATE USING (auth.uid() = id);

-- GPTs Lite are public but with access control
CREATE POLICY "GPTs Lite are viewable by all" ON gpts_lite
  FOR SELECT USING (is_active = true);

-- GPTs Premium require premium plan
CREATE POLICY "GPTs Premium viewable by premium users" ON gpts_premium
  FOR SELECT USING (
    is_active = true AND (
      EXISTS (
        SELECT 1 FROM users_profile
        WHERE id = auth.uid()
        AND plan = 'premium'
      )
    )
  );

-- User purchases are private
CREATE POLICY "Users can view own purchases" ON user_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- User unlocked GPTs are private
CREATE POLICY "Users can view own unlocked GPTs" ON user_unlocked_gpts
  FOR SELECT USING (auth.uid() = user_id);

-- Reviews are public to read, but users can only create/edit their own
CREATE POLICY "Reviews are public to read" ON gpt_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create own reviews" ON gpt_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON gpt_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON gpt_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 11. CREATE VIEWS FOR EASIER QUERYING
-- ============================================

-- View for GPTs with user access info
CREATE OR REPLACE VIEW v_user_gpts_access AS
SELECT 
  g.id,
  g.slug,
  g.name,
  g.description,
  g.category_id,
  g.chat_link,
  g.icon_url,
  g.tags,
  'lite' as gpt_type,
  g.unlock_price,
  g.average_rating,
  g.total_reviews,
  CASE 
    WHEN up.plan = 'premium' THEN true
    WHEN ug.user_id IS NOT NULL THEN true
    ELSE false
  END as has_access,
  ug.unlocked_at
FROM gpts_lite g
LEFT JOIN users_profile up ON up.id = auth.uid()
LEFT JOIN user_unlocked_gpts ug ON ug.gpt_lite_id = g.id AND ug.user_id = auth.uid()
WHERE g.is_active = true;

-- Grant permissions on views
GRANT SELECT ON v_user_gpts_access TO authenticated;

-- ============================================
-- End of migration
-- ============================================