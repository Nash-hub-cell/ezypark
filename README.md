# We-Up: A Web-Based Goal and Progress Tracking Application (Supabase Edition)

## 1. Overview

We-Up is a simple yet powerful web application designed to help users track their personal progress in any activity they choose. Whether it's fitness, learning a new skill, or building a new habit, We-Up provides a clean and encouraging interface to help you stay motivated and achieve your goals.

This version of the project uses **Supabase** for all backend services, including authentication and a Postgres database.

## 2. Features

*   **User Authentication:** Secure sign-up and login system using Supabase Authentication.
*   **Goal Management:** Full CRUD (Create, Read, Update, Delete) functionality for personal goals.
*   **Progress Logging:** Users can log quantitative progress for each of their goals.
*   **Data Visualization:** A dynamic line chart visualizes progress over time.
*   **Motivational Messaging:** Displays a random motivational quote to keep users inspired.
*   **Secure by Default:** Uses Supabase's Row Level Security (RLS) to ensure users can only access their own data.

## 3. Setup and Running the Project

To run this application, you will need to set up a free Supabase project to handle the backend.

### Step 1: Create a Supabase Project

1.  Go to [supabase.com](https://supabase.com/), sign up, and create a new project.
2.  When creating the project, make sure to save your **Database Password** securely.
3.  Once the project is created, navigate to the **Project Settings** (the gear icon).
4.  Go to the **API** section. Here you will find your **Project URL** and your `public` **anon key**. You will need these for Step 3.

### Step 2: Set Up the Database Schema

You need to create two tables in your Supabase database: `goals` and `progress`.

1.  In your Supabase project, go to the **SQL Editor** (the icon that looks like a terminal window with `SQL` on it).
2.  Click **"New query"**.
3.  Copy the entire SQL script below and paste it into the SQL Editor.
4.  Click **"RUN"** to execute the script. This will create the tables and enable Row Level Security.

```sql
-- 1. Create the 'goals' table
CREATE TABLE public.goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goals_pkey PRIMARY KEY (id),
  CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Create the 'progress' table
CREATE TABLE public.progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL,
  value numeric NOT NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT progress_pkey PRIMARY KEY (id),
  CONSTRAINT progress_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE
);

-- 3. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
```

### Step 3: Set Up Row Level Security (RLS) Policies

For security, you must define rules that control which rows users can access. Run the following SQL script in the **SQL Editor** in the same way you did for the tables.

```sql
-- POLICIES FOR 'goals' TABLE

-- 1. Allow users to view their own goals
CREATE POLICY "Users can view their own goals"
ON public.goals FOR SELECT
USING (auth.uid() = user_id);

-- 2. Allow users to insert their own goals
CREATE POLICY "Users can insert their own goals"
ON public.goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to update their own goals
CREATE POLICY "Users can update their own goals"
ON public.goals FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Allow users to delete their own goals
CREATE POLICY "Users can delete their own goals"
ON public.goals FOR DELETE
USING (auth.uid() = user_id);


-- POLICIES FOR 'progress' TABLE

-- 1. Allow users to view progress for their own goals
CREATE POLICY "Users can view progress for their own goals"
ON public.progress FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.goals
    WHERE goals.id = progress.goal_id AND goals.user_id = auth.uid()
  )
);

-- 2. Allow users to insert progress for their own goals
CREATE POLICY "Users can insert progress for their own goals"
ON public.progress FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.goals
    WHERE goals.id = progress.goal_id AND goals.user_id = auth.uid()
  )
);
```

### Step 4: Configure the Application

1.  Open the `script.js` file in this project.
2.  At the top of the file, replace the placeholder values for `SUPABASE_URL` and `SUPABASE_ANON_KEY` with the values you copied from your Supabase project's API settings.

### Step 5: Run the Application

To run the app, you need to serve the files from a local web server.
1.  Open your terminal or command prompt.
2.  Navigate to the root directory of this project.
3.  Run `python -m http.server`.
4.  Open your web browser and go to `http://localhost:8000`.
