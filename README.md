# DIA Marketplace Platform

A comprehensive two-sided marketplace platform for artisan services, built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

### Authentication System
- Multi-role authentication (Client, Technician, Admin, Support)
- Email/password signup and login
- Password reset functionality
- Role-based access control
- Protected routes with automatic redirects

### Client Dashboard
- Request new services with detailed forms
- Track job status in real-time
- View active and past jobs
- Chat with support
- Profile management

### Technician Dashboard
- View available jobs matching skills
- Accept/reject job assignments
- Update job status (accepted → in progress → completed)
- View earnings and performance stats
- Chat with support

### Admin Dashboard
- Overview of all platform activity
- Assign jobs to technicians
- Monitor job progress
- Handle disputes
- Manage support chats
- View statistics and reports

### Job Flow System
1. Client submits job request
2. Job stored in database with 'pending' status
3. Admin assigns OR technicians can claim jobs
4. Technician accepts job
5. Job status updates dynamically
6. Chat enabled between parties
7. Job marked completed by technician
8. Client confirms completion

### Chat System
- Real-time messaging using Supabase subscriptions
- Job-specific chat rooms
- Support chat for clients and technicians
- Message history with timestamps
- Read receipts

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS 3.4, shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: React Context + Hooks
- **Routing**: React Router v6
- **Icons**: Lucide React

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── dashboard/       # Dashboard layout components
│   ├── chat/            # Chat components
│   ├── jobs/            # Job-related components
│   └── ProtectedRoute.tsx
├── hooks/
│   ├── useAuth.tsx      # Authentication context
│   ├── useJobs.tsx      # Job management hooks
│   ├── useChat.tsx      # Chat functionality
│   └── useNotifications.tsx
├── lib/
│   └── supabase.ts      # Supabase client configuration
├── pages/
│   ├── auth/            # Login, Signup, ForgotPassword
│   ├── dashboard/       # Client, Technician, Admin dashboards
│   └── LandingPage.tsx  # Public landing page
├── types/
│   └── database.ts      # TypeScript type definitions
└── App.tsx              # Main app with routing
```

## Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Copy your project URL and anon key
3. Run the SQL in `supabase-setup.sql` in the SQL Editor

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
```

## Database Schema

### Profiles Table
Extends Supabase auth.users with additional fields:
- `role`: client | technician | admin | support
- `full_name`, `phone`, `address`
- Technician fields: `skills`, `years_experience`, `rating`, `is_available`

### Jobs Table
Stores all service requests:
- `client_id`, `technician_id`, `assigned_by`
- `status`: pending → assigned → accepted → in_progress → completed → confirmed
- `category`, `description`, `location`, `budget`
- `urgency`: low | medium | high | emergency

### Messages Table
Stores chat messages:
- `job_id` or `chat_room_id`
- `sender_id`, `receiver_id`
- `content`, `attachments`, `is_read`

### Chat Rooms Table
Manages support conversations:
- `user_id`, `support_id`
- `subject`, `status`

## User Flows

### Client Flow
1. Sign up as client
2. Browse services on landing page
3. Request service via dashboard
4. Track job status
5. Communicate with technician/support
6. Confirm job completion and leave review

### Technician Flow
1. Sign up as technician
2. Complete profile with skills
3. View available jobs
4. Accept jobs
5. Update job status
6. Complete jobs and get rated

### Admin Flow
1. Access admin dashboard
2. View pending jobs
3. Assign jobs to technicians
4. Monitor all jobs
5. Handle disputes
6. Manage support chats

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Protected API routes
- Secure authentication via Supabase Auth

## Deployment

### Deploy to Vercel/Netlify

1. Push code to GitHub
2. Connect repository to Vercel/Netlify
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in deployment dashboard (Build/Environment Variables)
4. Deploy

Important:
- Do not deploy with placeholder values like `https://your-project.supabase.co` or `your-anon-key`.
- For Vite apps, these values are injected at build time. If you change them, trigger a new build/redeploy.

### Supabase Configuration

Ensure these settings in Supabase:
- Authentication > Settings > Site URL: Your production URL
- Authentication > Email Templates: Customize as needed
- Database > Replication: Realtime enabled for jobs, messages, notifications

## Customization

### Adding New Service Categories

1. Add to `serviceCategories` array in `ClientRequestService.tsx`
2. Add to database `service_categories` table

### Modifying Job Status Flow

Edit the `JobStatus` type in `types/database.ts` and update status logic in components.

### Theming

Colors are defined in:
- `tailwind.config.js` - Primary color: `#00C853`
- Component styles use Tailwind classes

## Support

For issues or questions:
- Email: hello@diaconcierge.com
- Phone: +234 816 222 3364

## License

© 2024 DIA Services. All rights reserved.
