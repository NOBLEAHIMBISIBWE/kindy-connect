# School Connect 🎓

A comprehensive school management system built with TanStack Start and Supabase.

## Features

- 👥 **User Management** - Multi-role system (Super Admin, Admin, Deputy, Teacher)
- 🏫 **Multi-School Support** - Manage multiple schools from one system
- 👶 **Pupil Management** - Complete student records with photos
- 📊 **Attendance Tracking** - Arrival/departure logging with guardian info
- 📝 **Marks & Grading** - Subject-wise assessment tracking
- 👨‍👩‍👧 **Parent Portal** - Parent-pupil relationship management
- 📱 **Notifications** - SMS/Email alerts for arrivals and departures
- 📈 **Reports** - Analytics and performance reports
- 🔒 **Row Level Security** - School-based data isolation
- 🎨 **Modern UI** - Built with Radix UI and Tailwind CSS

## Tech Stack

- **Frontend:** React 19, TanStack Router, TanStack Start
- **Backend:** Nitro (Node.js)
- **Database:** PostgreSQL (Supabase)
- **Styling:** Tailwind CSS v4, Radix UI
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Deployment:** Vercel

## Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (Supabase recommended)
- Vercel account (for deployment)

## Quick Start

### 1. Clone & Install

\`\`\`bash
git clone https://github.com/Blue-Ox-Internship/kindy-connect
cd kindy-connect
npm install
\`\`\`

### 2. Database Setup ⚠️ **REQUIRED**

**IMPORTANT:** The database connection is currently not working and needs to be fixed first.

See **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** for complete instructions.

**Quick Fix:**

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Get your database URL** from Project Settings → Database (use the pooling URL)
3. **Update `.env` file** with your actual database URL:
   \`\`\`env
   DATABASE_URL=postgresql://postgres.[YOUR_PROJECT_ID]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   \`\`\`
4. **Test connection:** \`npm run db:test\`
5. **Setup schema:** \`npm run db:setup\`

### 3. Environment Setup

Update the `.env` file with your credentials:

\`\`\`env
# Database (REQUIRED - Replace with your actual Supabase URL)
DATABASE_URL=postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Environment
NODE_ENV=development

# Optional: Supabase client configuration
# VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key_here
\`\`\`

### 4. Database Schema Setup

\`\`\`bash
# Test your database connection first
npm run db:test

# Then set up the database schema
npm run db:setup

# Alternative: Manual setup using psql
# psql "$DATABASE_URL" -f database/schema.sql
\`\`\`

### 5. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Visit: http://localhost:3000

### 6. Login

Default superadmin:

- **ID:** \`admin\`
- **Password:** \`admin123\`

⚠️ Change password immediately after first login!

## Available Scripts

\`\`\`bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Lint code
npm run format       # Format with Prettier
npm run db:test      # Test database connection
npm run db:setup     # Initialize database schema
\`\`\`

## Database Commands

\`\`\`bash
# Test your database connection
npm run db:test

# Set up the database schema (run after creating Supabase project)
npm run db:setup

# Manual schema setup (alternative)
psql "$DATABASE_URL" -f database/schema.sql
\`\`\`

## Project Structure

\`\`\`
kindy-connect/
├── src/
│ ├── components/ # Reusable UI components
│ ├── hooks/ # Custom React hooks
│ ├── lib/ # Database, utilities
│ │ ├── db.ts # PostgreSQL client
│ │ ├── db-functions.ts # Database operations
│ │ └── mock-store.tsx # State management
│ ├── routes/ # TanStack Router pages
│ │ ├── index.tsx # Login page
│ │ ├── app.dashboard.tsx # Main dashboard
│ │ ├── app.pupils.tsx # Pupil management
│ │ ├── app.attendance.tsx # Attendance tracking
│ │ └── ...
│ ├── router.tsx # Router configuration
│ └── styles.css # Global styles
├── database/
│ ├── schema.sql # Database schema
│ ├── seed.sql # Sample data
│ └── rls-policies.sql # Row level security
├── supabase/
│ └── migrations/ # Database migrations
└── .env # Environment variables
\`\`\`

## Database Schema

### Core Tables

- **schools** - School information
- **users** - Teachers, admins, deputies
- **classes** - Class/grade information
- **pupils** - Student records
- **parents** - Guardian information
- **pupil_parents** - Parent-student relationships
- **attendance** - Daily attendance logs
- **marks** - Academic assessments
- **notifications** - SMS/Email logs
- **audit_logs** - System activity tracking

### Row Level Security (RLS)

Data is isolated by \`school_id\`. Users can only access:

- Their own school's data (admins, teachers)
- All schools (super_admins)

## User Roles

| Role            | Permissions                            |
| --------------- | -------------------------------------- |
| **Super Admin** | Full system access, manage all schools |
| **Admin**       | Full access within their school        |
| **Deputy**      | Limited admin access within school     |
| **Teacher**     | View/edit assigned classes only        |

## Development

### Available Scripts

\`\`\`bash
npm run dev # Start dev server
npm run build # Production build
npm run preview # Preview production build
npm run lint # Lint code
npm run format # Format with Prettier
\`\`\`

### Database Migrations

\`\`\`bash

# Create migration

supabase migration new migration_name

# Apply migrations

supabase db push

# Pull remote schema

supabase db pull
\`\`\`

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**

2. **Connect to Vercel**
   - Import project
   - Select TanStack Start framework

3. **Add Environment Variables**
   - DATABASE_URL
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NODE_ENV=production

4. **Deploy**

See \`DEPLOY_NOW.md\` for detailed instructions.

## Configuration

### Supabase Setup

1. Create project at https://supabase.com
2. Run \`database/schema.sql\` in SQL Editor
3. Run \`CREATE_ADMIN_USER.sql\` to create superadmin
4. Copy connection string and API keys to \`.env\`

### Email/SMS Notifications (Optional)

\`\`\`env
VITE_SMS_API_KEY=your-sms-api-key
VITE_SMS_API_URL=https://api.sms-provider.com
VITE_EMAIL_API_KEY=your-email-api-key
VITE_EMAIL_FROM=noreply@yourschool.com
\`\`\`

## Troubleshooting

### Database Connection Errors

**Paused Database (Supabase Free Tier):**

- Go to dashboard → Restore project
- Wait 2 minutes
- Retry connection

**Connection Timeout:**

- Check DATABASE_URL format
- Ensure database is active
- Verify network/firewall

### Build Errors

**Memory Issues:**
\`\`\`bash
export NODE_OPTIONS=--max-old-space-size=4096
npm run build
\`\`\`

## Security Notes

⚠️ **Critical:**

- **Never commit \`.env\`** to version control
- **Change default admin password** immediately
- **Use HTTPS** in production
- **Implement password hashing** (currently plain text)
- **Enable Supabase RLS policies**

## Contributing

1. Fork the repository
2. Create feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit changes (\`git commit -m 'Add amazing feature'\`)
4. Push to branch (\`git push origin feature/amazing-feature\`)
5. Open Pull Request

## License

Private - © 2025 Blue Ox Internship

## Support

For issues or questions:

- Check \`/docs/\*.md\` files in the repo
- Open an issue on GitHub
- Contact: nobleahimbisibwe5@gmail.com

## Roadmap

- [ ] Implement bcrypt password hashing
- [ ] Add Supabase Auth integration
- [ ] Mobile app (React Native)
- [ ] Fee management module
- [ ] Timetable management
- [ ] Report card generation (PDF)
- [ ] Bulk SMS/Email
- [ ] Photo gallery
- [ ] Event calendar
- [ ] Parent mobile app

---

**Built with ❤️ for Little Stars School**
