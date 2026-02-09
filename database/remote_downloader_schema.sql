-- Add download_tasks table
CREATE TABLE IF NOT EXISTS public.download_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('youtube', 'torrent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'uploading', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    quality TEXT DEFAULT '720p',
    filename TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add duration to media_library if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media_library' AND column_name='duration') THEN
        ALTER TABLE public.media_library ADD COLUMN duration INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_download_tasks_updated_at
    BEFORE UPDATE ON public.download_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.download_tasks;

-- RLS (Restrict to authenticated admins if needed, for now just basic auth)
ALTER TABLE public.download_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage download tasks" ON public.download_tasks
    FOR ALL USING (true); -- Simplify for MVP, should be restricted by user role
