# Project Structure

## Monorepo Organization
```
├── backend/          # NestJS API server
├── frontend/         # Next.js web application
├── .kiro/           # Kiro IDE configuration and specs
└── .git/            # Git repository
```

## Backend Structure (`backend/`)
```
src/
├── ai/                    # AI service and LangChain integration
├── config/               # Configuration management
├── conversations/        # Conversation management module
├── database/            # Database configuration and schema
│   ├── migrations/      # Drizzle migrations
│   ├── seeds/          # Database seeding scripts
│   └── schema.ts       # Drizzle schema definitions
├── products/           # Product catalog module
├── whatsapp/          # WhatsApp Business API integration
│   ├── controllers/   # Webhook and API controllers
│   ├── dto/          # Data transfer objects
│   ├── exceptions/   # Custom exceptions
│   ├── interfaces/   # TypeScript interfaces
│   └── services/     # WhatsApp and encryption services
├── app.module.ts     # Root application module
└── main.ts          # Application entry point
```

## Frontend Structure (`frontend/`)
```
src/
├── app/                  # Next.js App Router
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/          # React components
│   ├── ai-training/    # AI configuration components
│   ├── dashboard/      # Dashboard components
│   ├── products/       # Product management components
│   ├── ui/            # shadcn/ui components
│   └── whatsapp/      # WhatsApp connection components
├── hooks/              # Custom React hooks
└── lib/               # Utility functions and API client
    ├── api.ts         # API client configuration
    └── utils.ts       # Utility functions
```

## Module Organization Patterns

### Backend Modules
- Each feature area is organized as a NestJS module
- Services contain business logic
- Controllers handle HTTP requests and webhooks
- DTOs define data validation schemas
- Interfaces define TypeScript contracts

### Frontend Components
- Feature-based component organization
- Shared UI components in `components/ui/`
- Custom hooks for reusable logic
- API client centralized in `lib/api.ts`

## Database Schema Organization
- Single schema file with all table definitions
- Relations defined using Drizzle relations
- Type exports for TypeScript integration
- Enums and constants for type safety

## Configuration Management
- Environment-specific configuration in `.env` files
- Database configuration centralized in `database/config.ts`
- Frontend API configuration in `lib/api.ts`

## Testing Structure
- Unit tests co-located with source files (`.spec.ts`)
- E2E tests in dedicated `test/` directory
- Test configuration in `jest` and `jest-e2e.json`