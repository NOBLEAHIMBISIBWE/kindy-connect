# Database Setup Guide

## Current Status

The Kindy Connect project is currently running in **Mock Mode** with sample data. This is perfect for development and testing, but for production use, you'll want to set up a real database.

**Mock Mode Features:**
- ✅ All features work with sample data
- ✅ No setup required - works out of the box
- ✅ Perfect for development and testing
- ⚠️  Data doesn't persist between restarts

## Database Setup Options

Choose the option that best fits your needs:

### Option 1: Continue with Mock Mode (Recommended for Development)

If you're just testing the application or developing features, **no setup is required**! The application already works with sample data.

**Pros:**
- ✅ Zero configuration
- ✅ Works immediately
- ✅ Perfect for learning and development

**Cons:**
- ⚠️  Data doesn't persist between app restarts
- ⚠️  Not suitable for production

**To use:** Simply continue using the application as-is. All features work with the built-in sample data.

---

### Option 2: Set Up Supabase Database (Recommended for Production)

**When you need persistent data storage:**

1. **Create a Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up or log in (free tier available)

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Enter project name: `kindy-connect` (or your preferred name)
   - Enter database password (**save this password!**)
   - Select region (preferably close to your users)
   - Wait for project to be created (2-3 minutes)

3. **Get Database URL**
   - Go to Project Settings → Database
   - Copy the "Connection pooling" URL (should use port 6543)
   - Format: `postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

4. **Update .env File**
   - Open your `.env` file
   - Find the line: `# DATABASE_URL=postgresql://localhost:5432/kindy_connect_dev`
   - Replace it with: `DATABASE_URL=your_actual_connection_string_here`
   - Save the file

5. **Set Up Database Schema**
   ```bash
   # This will create all the required tables and relationships
   npm run db:setup
   ```

6. **Verify Setup**
   ```bash
   # Test your database connection
   npm run db:test
   ```

7. **Restart Development Server**
   ```bash
   npm run dev
   ```

The application will automatically switch from mock mode to database mode!

---

### Option 3: Use Existing Supabase Project

If you already have a Supabase project:

1. **Get Your Database URL**
   - Go to Project Settings → Database in your existing project
   - Copy the connection pooling URL

2. **Update .env File**
   - Add your DATABASE_URL to the `.env` file

3. **Set Up Schema**
   ```bash
   npm run db:setup
   npm run db:test
   ```

---

### Option 4: Local Development with Supabase CLI

For local development with Supabase:

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

4. **Update .env and Setup Schema**
   ```bash
   # Add the local URL to .env
   # Then run setup
   npm run db:setup
   ```

## How to Check Current Mode

The application will show you which mode it's running in:

**Mock Mode:** You'll see a warning in the console: "📝 Using mock data for development (no database connection)"

**Database Mode:** You'll see: "✅ Database connected successfully"

## Default Users (Both Modes)

**Mock Mode:**
- Admin: ID: `admin-1`, Password: `admin123` (default, see mock-data.ts)

**Database Mode:**
- Super Admin: ID: `admin`, Password: `admin123` (see database/seed.sql)

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
