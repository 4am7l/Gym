-- Run once in Supabase SQL Editor. Existing members remain unchanged.
CREATE TABLE IF NOT EXISTS public.fitness_measurements (
  member_id bigint PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  chest numeric(6,1), waist numeric(6,1), arms numeric(6,1),
  hips numeric(6,1), calves numeric(6,1), thigh numeric(6,1),
  weight numeric(6,1), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT measurements_nonnegative CHECK (
    (chest IS NULL OR chest BETWEEN 0 AND 1000) AND
    (waist IS NULL OR waist BETWEEN 0 AND 1000) AND
    (arms IS NULL OR arms BETWEEN 0 AND 1000) AND
    (hips IS NULL OR hips BETWEEN 0 AND 1000) AND
    (calves IS NULL OR calves BETWEEN 0 AND 1000) AND
    (thigh IS NULL OR thigh BETWEEN 0 AND 1000) AND
    (weight IS NULL OR weight BETWEEN 0 AND 1000)
  )
);
