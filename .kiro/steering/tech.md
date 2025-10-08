# Technology Stack

## Architecture
Full-stack TypeScript application with separate backend and frontend services.

## Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI/ML**: LangChain with OpenAI integration
- **File Storage**: Google Cloud Storage
- **Authentication**: bcrypt for password hashing
- **API Documentation**: Swagger/OpenAPI
- **Image Processing**: Sharp
- **Validation**: class-validator, class-transformer

## Frontend (Next.js)
- **Framework**: Next.js 15 with App Router
- **UI Library**: Radix UI components with Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS with custom animations

## Development Tools
- **Language**: TypeScript throughout
- **Linting**: ESLint with Prettier
- **Testing**: Jest for unit tests, Supertest for e2e
- **Database Migrations**: Drizzle Kit
- **Build Tool**: Turbopack (Next.js)

## Common Commands

### Backend
```bash
# Development
npm run start:dev          # Start with hot reload
npm run build             # Build for production
npm run start:prod        # Start production build

# Database
npm run db:generate       # Generate migrations
npm run db:migrate        # Run migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open Drizzle Studio
npm run db:seed          # Seed database
npm run db:reset         # Reset and seed database

# Testing
npm run test             # Unit tests
npm run test:e2e         # End-to-end tests
npm run test:cov         # Test coverage
```

### Frontend
```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

## Environment Setup
- Backend requires `.env` file with database and API credentials
- Frontend requires `.env.local` with API URL configuration
- Both services run independently (backend: 3001, frontend: 3000)