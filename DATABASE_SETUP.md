# Database Setup Guide

## Issue Description

The Kindy Connect project requires a Supabase PostgreSQL database. The current DATABASE_URL in `.env` contains placeholder values that need to be replaced with actual database credentials.

## Fix Instructions

### Option 1: Create New Supabase Project (Recommended)

1. **Create a Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up or log in

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Enter project name: `kindy-connect` (or your preferred name)
   - Enter database password (save this password!)
   - Select region (preferably close to your users)
   - Wait for project to be created

3. **Get Database URL**
   - Go to Project Settings → Database
   - Copy the "Connection pooling" URL (it should use port 6543)
   - The URL format will be: `postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

4. **Update .env File**
   - Replace the DATABASE_URL in `.env` with your actual connection string
   - Example:
     ```
     DATABASE_URL=postgresql://postgres.abcdefghijklmnop:your_actual_password@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
     ```

5. **Set Up Database Schema**

   ```bash
   # Run the schema setup (you may need to install postgres CLI tools)
   psql "your_database_url_here" -f database/schema.sql

   # Or use the included setup script
   node setup-database.js
   ```

### Option 2: Use Existing Supabase Project

If you have an existing Supabase project:

1. Get your project's connection string from Project Settings → Database
2. Update the DATABASE_URL in `.env`
3. Run the database schema if not already applied

### Option 3: Local Development with Supabase CLI

1. **Install Supabase CLI**

   ```bash
   npm install -g supabase
   ```

2. **Initialize Local Supabase**

   ```bash
   supabase init
   supabase start
   ```

3. **Get Local Database URL**
   ```bash
   supabase status
   ```
   Use the DB URL provided (typically `postgresql://postgres:postgres@127.0.0.1:54322/postgres`)

## Verification

After setting up your database:

1. **Test Connection**

   ```bash
   node test-database-connection.js
   ```

2. **Verify Schema**
   The following tables should exist:
   - schools
   - users
   - classes
   - subjects
   - pupils
   - parents
   - pupil_parents
   - attendance
   - notifications
   - audit_logs
   - marks

3. **Run Application**
   ```bash
   npm run dev
   ```

## Common Issues

- **Connection timeout**: Make sure you're using the pooling URL (port 6543) not the direct connection (port 5432)
- **Authentication failed**: Double-check your password and project ID
- **Schema not found**: Run the schema.sql file to create all required tables

## Security Notes

- Never commit real database credentials to version control
- Use environment variables for all sensitive data
- Consider using different databases for development, staging, and production
