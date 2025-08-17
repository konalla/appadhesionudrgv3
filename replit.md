# UDRG Membership Management System

## Overview
The UDRG Membership Management System is a comprehensive web application designed for the Union des Démocrates Pour La Renaissance de la Guinée (UDRG). Its primary purpose is to manage political party members, federations, and administrative operations. The system supports bilingual operation (French/English) and offers offline capabilities, aiming to provide a robust, secure, and user-friendly platform for efficient membership management and party administration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Internationalization**: react-i18next (French/English)
- **Forms**: React Hook Form with Zod validation
- **PWA Support**: Service Worker for offline capabilities

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js with session-based authentication
- **Database ORM**: Drizzle ORM (PostgreSQL dialect)
- **Session Storage**: In-memory store
- **File Uploads**: Multer
- **Email Service**: SendGrid integration
- **PDF Generation**: PDFKit and @pdfme/generator

### Data Storage
- **Primary Database**: PostgreSQL 14+
- **File Storage**: Local filesystem (planned cloud migration)
- **Offline Storage**: IndexedDB for client-side caching

### Key Features
- **Authentication & Authorization**: Session-based, role-based access control (sysadmin, admin), protected routes.
- **Member Management**: CRUD operations, photo upload, QR code generation, duplicate detection, data export (CSV, Excel).
- **Administrative Features**: Federation/region/section management, user management, statistical reporting, bulk import.
- **Communication System**: Direct and group messaging, SendGrid email notifications.
- **Offline Capabilities**: PWA, Service Worker caching, IndexedDB for data, request queuing, automatic synchronization.
- **UI/UX**: Consistent dark theme, optimized layouts for mobile/tablet, responsive design, professional typography.
- **Image Handling**: Robust system for photo uploads, serving, and display, with comprehensive error handling for corrupted or missing photos.
- **Internationalization**: Full bilingual support (French/English) across all UI elements and interfaces.

### Core Architectural Decisions
- Emphasis on performance and memory management, especially for mobile and tablet devices.
- Robust error handling and crash protection for critical components.
- Prioritization of security through session-based authentication, role-based access, and secure data handling.
- Flexible deployment strategy designed for VPS environments with automated deployment and backup scripts.
- Data integrity maintained through systematic database corrections and synchronization mechanisms.
- Deployment size optimization with multi-stage Docker builds and comprehensive build scripts for Cloud Run deployment constraints.

## External Dependencies

- **Database**: Neon PostgreSQL serverless
- **Email Service**: SendGrid
- **CDN/Fonts**: Google Fonts
- **Icons**: Lucide React
- **PDF Generation**: PDFKit, @pdfme/generator