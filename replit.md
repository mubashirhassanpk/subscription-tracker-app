# Subscription Tracker

## Overview

This is a subscription tracker application that helps users manage and monitor their recurring subscriptions. Built with React, TypeScript, and Express.js, the application provides a clean dashboard to track subscription costs, billing cycles, categories, and renewal dates. Users can add, edit, and delete subscriptions while getting insights into their total monthly and yearly spending. The app features a responsive design with both light and dark themes, inspired by productivity-focused applications like Notion and Linear.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation
- **Theme System**: Custom theme provider supporting light/dark modes

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API with conventional endpoints
- **Request Handling**: JSON body parsing and URL encoding
- **Error Handling**: Centralized error middleware with status code mapping
- **Development**: Hot reload with Vite integration
- **Storage Layer**: Abstracted storage interface for flexibility

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Connection**: Node.js pg driver with connection pooling
- **Schema Management**: Type-safe schema definitions with Drizzle
- **Validation**: Zod schemas for runtime type checking
- **Migrations**: Drizzle Kit for database migrations

### Design System
- **Typography**: Inter font family for clean readability
- **Color Palette**: Neutral-based with semantic color tokens
- **Layout**: Consistent spacing using Tailwind's 4-point grid system
- **Components**: Modular card-based design with consistent shadows and borders
- **Responsive**: Mobile-first approach with breakpoint-specific layouts

### Development Tools
- **Build System**: Vite for fast development and optimized production builds
- **Type Safety**: Strict TypeScript configuration across frontend and backend
- **Code Quality**: ESLint and Prettier integration
- **Path Aliases**: Clean import paths using TypeScript path mapping

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe SQL query builder and ORM
- **express**: Web application framework for Node.js
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight routing library

### UI and Styling
- **tailwindcss**: Utility-first CSS framework
- **@radix-ui/react-***: Headless UI components for accessibility
- **class-variance-authority**: Component variant management
- **clsx**: Conditional CSS class utility
- **lucide-react**: Icon library

### Form and Validation
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Runtime type validation
- **drizzle-zod**: Zod schema generation from Drizzle schemas

### Utilities
- **date-fns**: Date manipulation library
- **nanoid**: URL-safe unique ID generator
- **cmdk**: Command palette component

### Development
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **@vitejs/plugin-react**: React integration for Vite
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production builds