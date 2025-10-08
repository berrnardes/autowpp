# Technology Stack

## Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI/ML**: LangChain with OpenAI integration
- **Authentication**: WhatsApp Business API with encrypted credential storage
- **Encryption**: crypto-js for sensitive data
- **Validation**: class-validator and class-transformer
- **Testing**: Jest for unit and e2e tests

## Frontend
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui with Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Notifications**: Sonner for toast notifications
- **API Client**: Axios for HTTP requests
- **State Management**: React Query (TanStack Query) for server state management

## Database
- **ORM**: Drizzle with PostgreSQL dialect
- **Migrations**: Drizzle Kit for schema management
- **Seeding**: Custom seed scripts for initial data

## Development Tools
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Build**: Turbopack for Next.js, standard NestJS build

## Common Commands

### Backend Development
```bash
# Development
npm run start:dev          # Start with watch mode
npm run start:debug        # Start with debug mode

# Database
npm run db:generate        # Generate migrations
npm run db:migrate         # Run migrations
npm run db:push           # Push schema changes
npm run db:studio         # Open Drizzle Studio
npm run db:seed           # Run seed scripts
npm run db:reset          # Reset and seed database

# Testing
npm run test              # Unit tests
npm run test:watch        # Watch mode
npm run test:e2e          # End-to-end tests
npm run test:cov          # Coverage report

# Code Quality
npm run lint              # ESLint
npm run format            # Prettier
```

### Frontend Development
```bash
# Development
npm run dev               # Start dev server with Turbopack
npm run build             # Production build with Turbopack
npm run start             # Start production server
npm run lint              # ESLint

# Dependencies
npm install @tanstack/react-query axios  # Install React Query and Axios
```

## Environment Configuration
- Backend uses `.env` for database, WhatsApp API, OpenAI, and encryption keys
- Frontend uses `NEXT_PUBLIC_` prefixed variables for client-side config
- All sensitive credentials are encrypted before database storage