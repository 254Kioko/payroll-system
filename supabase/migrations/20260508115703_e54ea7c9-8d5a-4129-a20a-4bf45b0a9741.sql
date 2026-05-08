ALTER TABLE public.expenses ADD COLUMN room_id uuid NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_room_id ON public.expenses(room_id);