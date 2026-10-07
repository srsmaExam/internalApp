-- 0014_add_attempt_telemetry.sql
-- Add telemetry columns for student paper attempt tracking:
-- 1. Order of solving questions (solve_order)
-- 2. Time spent on each question (time_spent_ms already exists)
-- 3. Answer chosen correct or incorrect (is_correct already exists)
-- 4. Answer modifications (answer_modifications, modified_after_15s)
-- 5. Re-visits and split time (visit_times_ms)
-- 6. Time for first action (first_action_time_ms, first_action_type)

ALTER TABLE attempt_answers
  ADD COLUMN IF NOT EXISTS solve_order integer,
  ADD COLUMN IF NOT EXISTS first_action_time_ms integer,
  ADD COLUMN IF NOT EXISTS first_action_type text,
  ADD COLUMN IF NOT EXISTS visit_times_ms jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS answer_modifications jsonb DEFAULT '{"count": 0, "modifiedAfter15s": false, "after15sCount": 0, "history": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS modified_after_15s boolean DEFAULT false;

ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS solve_order uuid[];
