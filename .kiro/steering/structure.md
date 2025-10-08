# Project Structure

## Root Organization
```
├── backend/          # NestJS API server
├── frontend/         # Next.js web application
└── node_modules/     # Shared dependencies
```

## Backend Structure (`backend/`)
Follows NestJS modular architecture with feature-based organization:

```
src/
├── ai/                    # AI and conversation training
│   ├── controllers/       # AI-related endpoints
│   ├── services/          # AI logic and integrations
│   ├── dto/              # Data transfer objects
│   └── interfaces/       # TypeScript interfaces
├── conversations/         # Conversation management
├── products/             # Product catalog management
├── whatsapp/             # WhatsApp Business API integration
├── database/             # Database configuration and migrations
│   ├── migrations/       # Drizzle migrations
│   ├── seeds/           # Database seed files
│   └── schema.ts        # Database schema definitions
└── config/              # Application configuration
```

### Key Backend Patterns
- **Modules**: Each feature has its own module (ai.module.ts, products.module.ts, etc.)
- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and external integrations
- **DTOs**: Define request/response data structures with validation
- **Database**: Drizzle ORM with PostgreSQL, schema-first approach

## Frontend Structure (`frontend/`)
Follows Next.js App Router conventions:

```
src/
├── app/                  # Next.js App Router pages
│   ├── produtos/         # Products management page
│   └── whatsapp/         # WhatsApp configuration page
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── dashboard/       # Dashboard-specific components
│   ├── products/        # Product management components
│   └── whatsapp/        # WhatsApp integration components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and configurations
│   ├── api.ts           # API client and methods
│   └── utils.ts         # Helper utilities
└── types/               # TypeScript type definitions
```

### Key Frontend Patterns
- **Components**: Organized by feature with index.ts exports
- **Hooks**: Custom hooks for data fetching and state management
- **API Client**: Centralized HTTP client with typed methods
- **Types**: Shared TypeScript interfaces matching backend DTOs

## Naming Conventions
- **Files**: kebab-case for all files (`product-list.tsx`, `ai-service.ts`)
- **Components**: PascalCase for React components
- **Services**: camelCase with descriptive names
- **Database**: snake_case for table and column names
- **APIs**: RESTful endpoints with plural nouns (`/products`, `/conversations`)

## Module Dependencies
- Backend modules are loosely coupled with dependency injection
- Frontend components use composition over inheritance
- Shared types between frontend/backend for API contracts
- Database schema serves as single source of truth for data models