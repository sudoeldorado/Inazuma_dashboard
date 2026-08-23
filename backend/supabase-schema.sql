-- Create the signals table to store Telegram trade telemetry
CREATE TABLE IF NOT EXISTS public.signals (
    id BIGSERIAL PRIMARY KEY,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    channel_name TEXT DEFAULT 'Ghost Crypto',
    symbol TEXT NOT NULL,
    direction TEXT CHECK (direction IN ('BUY', 'SELL', 'LONG', 'SHORT')),
    entry_min NUMERIC,
    entry_max NUMERIC,
    tp_targets JSONB DEFAULT '[]'::jsonb,
    sl_target NUMERIC,
    status TEXT DEFAULT 'PENDING'
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Allow read access to anonymous clients
CREATE POLICY "Allow public read access"
ON public.signals
FOR SELECT
TO anon
USING (true);

-- Enable Realtime publication for signals table
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
