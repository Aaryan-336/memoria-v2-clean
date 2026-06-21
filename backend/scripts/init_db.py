import os
import sys
import re
import getpass
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from dotenv import load_dotenv

# Load env variables
load_dotenv(backend_dir / ".env")

def main():
    print("=== Memoria AI Supabase Database Initializer ===")
    
    supabase_url = os.getenv("SUPABASE_URL")
    if not supabase_url:
        print("Error: SUPABASE_URL not found in backend/.env")
        sys.exit(1)
        
    # Extract project reference
    # e.g., https://yizoggqpkfkmifupkzah.supabase.co -> yizoggqpkfkmifupkzah
    match = re.search(r"https://([^.]+)\.supabase\.co", supabase_url)
    if not match:
        print(f"Error: Could not extract project reference from URL: {supabase_url}")
        sys.exit(1)
        
    project_ref = match.group(1)
    db_host = f"db.{project_ref}.supabase.co"
    db_port = 5432
    db_name = "postgres"
    db_user = "postgres"
    
    print(f"Project Reference: {project_ref}")
    print(f"Database Host:     {db_host}")
    print(f"Database User:     {db_user}")
    print(f"Database Name:     {db_name}")
    print("-" * 50)
    
    # Prompt for password or read from env
    db_password = os.getenv("SUPABASE_DB_PASSWORD")
    if not db_password:
        print("Please enter your Supabase Database Password (defined when you created the project).")
        print("Note: This is NOT the service_role or anon key. It is the database password.")
        db_password = getpass.getpass("Database Password: ")
        
    if not db_password:
        print("Error: Password cannot be empty.")
        sys.exit(1)
        
    # Try to import pg8000
    try:
        import pg8000.dbapi
    except ImportError:
        print("Installing required database driver 'pg8000'...")
        import subprocess
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "pg8000"], check=True)
            import pg8000.dbapi
            print("pg8000 installed successfully.")
        except Exception as e:
            print(f"Error installing pg8000: {e}")
            print("Please run: venv/bin/pip install pg8000")
            sys.exit(1)
            
    print("Connecting to Supabase PostgreSQL database...")
    try:
        conn = pg8000.dbapi.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password,
            timeout=10
        )
        cursor = conn.cursor()
        print("Connected successfully!")
    except Exception as e:
        print(f"\nConnection failed: {e}")
        print("Please make sure:")
        print("1. The database password is correct.")
        print("2. Your IP address is not blocked (or you've allowed connections in Supabase dashboard).")
        print("3. The project reference in backend/.env is correct.")
        sys.exit(1)

    sql_script = """
    CREATE TABLE IF NOT EXISTS public.notes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      transcript TEXT,
      summary TEXT,
      notes TEXT,
      key_points TEXT[] DEFAULT '{}'::TEXT[],
      topics TEXT[] DEFAULT '{}'::TEXT[],
      action_items JSONB DEFAULT '[]'::JSONB,
      exam_questions TEXT[] DEFAULT '{}'::TEXT[],
      reminders JSONB DEFAULT '[]'::JSONB,
      mermaid_diagram TEXT,
      source_type TEXT,
      youtube_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
    );

    -- Enable RLS
    ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

    -- Create RLS Policies
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can insert their own notes'
        ) THEN
            CREATE POLICY "Users can insert their own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can view their own notes'
        ) THEN
            CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can update their own notes'
        ) THEN
            CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can delete their own notes'
        ) THEN
            CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);
        END IF;
    END
    $$;

    -- Flashcards Table
    CREATE TABLE IF NOT EXISTS public.flashcards (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      topic TEXT NOT NULL,
      content TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
    );

    -- Enable RLS for Flashcards
    ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

    -- Create RLS Policies for Flashcards
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'flashcards' AND policyname = 'Users can view their own flashcards'
        ) THEN
            CREATE POLICY "Users can view their own flashcards" ON public.flashcards FOR SELECT USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'flashcards' AND policyname = 'Users can insert their own flashcards'
        ) THEN
            CREATE POLICY "Users can insert their own flashcards" ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'flashcards' AND policyname = 'Users can delete their own flashcards'
        ) THEN
            CREATE POLICY "Users can delete their own flashcards" ON public.flashcards FOR DELETE USING (auth.uid() = user_id);
        END IF;
    END
    $$;
    """

    print("Running database initialization SQL...")
    try:
        # Execute each statement (separated by semicolons, but since DO $$ block contains semicolons,
        # we will run it as a single transaction block)
        cursor.execute(sql_script)
        conn.commit()
        print("\nSuccess! The 'notes' table and Row-Level Security (RLS) policies have been set up.")
    except Exception as e:
        conn.rollback()
        print(f"\nFailed to execute SQL: {e}")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
