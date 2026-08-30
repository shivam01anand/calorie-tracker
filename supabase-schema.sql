-- Calorie Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Food logs table
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  raw_input TEXT NOT NULL,
  parsed_meals JSONB NOT NULL DEFAULT '[]',
  total_calories INTEGER NOT NULL DEFAULT 0,
  total_protein INTEGER NOT NULL DEFAULT 0,
  total_carbs INTEGER NOT NULL DEFAULT 0,
  total_fat INTEGER NOT NULL DEFAULT 0,
  insights TEXT
);

-- Meal library table
CREATE TABLE IF NOT EXISTS meal_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  name_hindi TEXT,
  recipe_link TEXT,
  category TEXT NOT NULL CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack')),
  tags TEXT[] DEFAULT '{}',
  avg_calories INTEGER NOT NULL DEFAULT 0,
  avg_protein INTEGER NOT NULL DEFAULT 0,
  avg_carbs INTEGER NOT NULL DEFAULT 0,
  avg_fat INTEGER NOT NULL DEFAULT 0,
  is_suggested BOOLEAN DEFAULT FALSE
);

-- Weekly plans table
CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  week_start DATE NOT NULL UNIQUE,
  plan JSONB NOT NULL DEFAULT '{}'
);

-- User profile table (single row for you)
CREATE TABLE IF NOT EXISTS user_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  height_cm DECIMAL(5,2) NOT NULL,
  goal TEXT NOT NULL,
  daily_calorie_target INTEGER NOT NULL,
  daily_protein_target INTEGER NOT NULL
);

-- Weekly analysis table
CREATE TABLE IF NOT EXISTS weekly_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  week_start DATE NOT NULL,
  analysis TEXT NOT NULL,
  missing_nutrients TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}'
);

-- Encrypted Telegram conversation memory. Message content is sealed by the app
-- before it reaches Supabase; only routing metadata remains readable.
CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL,
  chat_key TEXT NOT NULL,
  source_message_id BIGINT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  kind TEXT NOT NULL CHECK (kind IN ('food_log', 'question', 'day_complete', 'other', 'reminder')),
  payload TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(date);
CREATE INDEX IF NOT EXISTS idx_meal_library_category ON meal_library(category);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_week_start ON weekly_plans(week_start);
CREATE INDEX IF NOT EXISTS idx_coach_messages_chat_date_created
  ON coach_messages(chat_key, date, created_at DESC);

-- Insert your profile
INSERT INTO user_profile (name, age, weight_kg, height_cm, goal, daily_calorie_target, daily_protein_target)
VALUES ('Shivam', 29, 69, 177, 'muscle_gain', 2500, 140)
ON CONFLICT DO NOTHING;

-- Seed meal library with initial meals
INSERT INTO meal_library (name, name_hindi, category, tags, avg_calories, avg_protein, avg_carbs, avg_fat, is_suggested) VALUES
-- Indian Breakfast
('Poha', 'पोहा', 'breakfast', ARRAY['indian', 'vegetarian', 'light'], 250, 6, 45, 6, true),
('Upma', 'उपमा', 'breakfast', ARRAY['indian', 'vegetarian', 'light'], 280, 8, 42, 8, true),
('Idli Sambar', 'इडली सांबर', 'breakfast', ARRAY['indian', 'vegetarian', 'high-protein'], 300, 10, 52, 5, true),
('Dosa with Chutney', 'डोसा चटनी', 'breakfast', ARRAY['indian', 'vegetarian'], 350, 8, 48, 14, true),
('Paratha with Curd', 'पराठा दही', 'breakfast', ARRAY['indian', 'vegetarian', 'high-calorie'], 400, 12, 45, 18, true),
('Egg Bhurji with Toast', 'अंडा भुर्जी टोस्ट', 'breakfast', ARRAY['indian', 'high-protein'], 380, 22, 28, 20, true),
('Oats with Banana', 'ओट्स केला', 'breakfast', ARRAY['continental', 'high-fiber'], 320, 12, 55, 6, true),
('Protein Smoothie', 'प्रोटीन स्मूदी', 'breakfast', ARRAY['continental', 'high-protein', 'quick'], 350, 30, 35, 8, true),

-- Indian Lunch
('Dal Tadka with Rice', 'दाल तड़का चावल', 'lunch', ARRAY['indian', 'vegetarian', 'high-protein'], 450, 18, 70, 10, true),
('Chicken Curry with Roti', 'चिकन करी रोटी', 'lunch', ARRAY['indian', 'high-protein', 'non-veg'], 550, 35, 45, 22, true),
('Rajma Chawal', 'राजमा चावल', 'lunch', ARRAY['indian', 'vegetarian', 'high-protein', 'high-fiber'], 480, 20, 75, 8, true),
('Chole with Bhature', 'छोले भटूरे', 'lunch', ARRAY['indian', 'vegetarian', 'high-calorie'], 650, 18, 85, 25, true),
('Fish Curry with Rice', 'मछली करी चावल', 'lunch', ARRAY['indian', 'high-protein', 'omega-3', 'non-veg'], 500, 32, 55, 15, true),
('Paneer Bhurji with Roti', 'पनीर भुर्जी रोटी', 'lunch', ARRAY['indian', 'vegetarian', 'high-protein'], 520, 28, 40, 28, true),
('Egg Curry with Rice', 'अंडा करी चावल', 'lunch', ARRAY['indian', 'high-protein', 'non-veg'], 480, 24, 55, 18, true),
('Mutton Curry with Roti', 'मटन करी रोटी', 'lunch', ARRAY['indian', 'high-protein', 'non-veg', 'iron-rich'], 600, 38, 42, 30, true),

-- Continental Lunch
('Grilled Chicken Salad', 'ग्रिल्ड चिकन सलाद', 'lunch', ARRAY['continental', 'high-protein', 'low-carb'], 400, 40, 15, 20, true),
('Quinoa Bowl with Vegetables', 'क्विनोआ बाउल', 'lunch', ARRAY['continental', 'vegetarian', 'high-protein', 'high-fiber'], 420, 16, 60, 12, true),

-- Indian Dinner
('Dal Palak with Roti', 'दाल पालक रोटी', 'dinner', ARRAY['indian', 'vegetarian', 'iron-rich'], 380, 18, 50, 10, true),
('Tandoori Chicken with Salad', 'तंदूरी चिकन सलाद', 'dinner', ARRAY['indian', 'high-protein', 'low-carb', 'non-veg'], 420, 45, 12, 22, true),
('Palak Paneer with Roti', 'पालक पनीर रोटी', 'dinner', ARRAY['indian', 'vegetarian', 'iron-rich', 'high-protein'], 480, 24, 42, 25, true),
('Grilled Fish with Vegetables', 'ग्रिल्ड मछली सब्जी', 'dinner', ARRAY['continental', 'high-protein', 'omega-3', 'low-carb'], 380, 38, 18, 18, true),
('Chicken Tikka with Raita', 'चिकन टिक्का रायता', 'dinner', ARRAY['indian', 'high-protein', 'non-veg'], 400, 42, 15, 20, true),
('Mixed Dal with Rice', 'मिक्स दाल चावल', 'dinner', ARRAY['indian', 'vegetarian', 'high-protein'], 420, 16, 65, 8, true),

-- Snacks
('Greek Yogurt with Nuts', 'ग्रीक योगर्ट मेवे', 'snack', ARRAY['high-protein', 'probiotics'], 200, 15, 12, 10, true),
('Protein Shake', 'प्रोटीन शेक', 'snack', ARRAY['high-protein', 'post-workout'], 180, 25, 8, 4, true),
('Boiled Eggs (2)', 'उबले अंडे', 'snack', ARRAY['high-protein', 'quick'], 140, 12, 1, 10, true),
('Almonds (handful)', 'बादाम मुट्ठी भर', 'snack', ARRAY['healthy-fats', 'vitamin-e'], 160, 6, 6, 14, true),
('Peanut Butter Toast', 'पीनट बटर टोस्ट', 'snack', ARRAY['high-protein', 'energy'], 250, 10, 25, 14, true),
('Sprouts Salad', 'स्प्राउट्स सलाद', 'snack', ARRAY['high-protein', 'vegetarian', 'high-fiber'], 150, 10, 20, 2, true),
('Banana with Peanut Butter', 'केला पीनट बटर', 'snack', ARRAY['energy', 'potassium', 'pre-workout'], 280, 8, 35, 12, true),
('Paneer Tikka (4 pcs)', 'पनीर टिक्का', 'snack', ARRAY['high-protein', 'vegetarian', 'indian'], 220, 16, 6, 16, true),
('Makhana (Fox Nuts)', 'मखाना', 'snack', ARRAY['indian', 'low-calorie', 'vegetarian'], 100, 4, 18, 1, true),
('Chana Chaat', 'चना चाट', 'snack', ARRAY['indian', 'high-protein', 'high-fiber', 'vegetarian'], 180, 10, 28, 4, true);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since this is a personal app)
CREATE POLICY "Allow all operations on food_logs" ON food_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on meal_library" ON meal_library FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on weekly_plans" ON weekly_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on user_profile" ON user_profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on weekly_analysis" ON weekly_analysis FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON coach_messages TO anon, authenticated;
CREATE POLICY "Read encrypted coach memory" ON coach_messages FOR SELECT USING (true);
CREATE POLICY "Insert encrypted coach memory" ON coach_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Update encrypted coach memory" ON coach_messages FOR UPDATE USING (true) WITH CHECK (true);
