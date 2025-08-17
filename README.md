# UDRG Membership Management System

A comprehensive web-based membership management system designed for the Union des Démocrates Pour La Renaissance de la Guinée (UDRG). This system streamlines member registration, tracking, and communication with advanced internationalization capabilities.

## 🌟 Features

### Core Functionality
- **Member Management**: Complete CRUD operations for member records
- **Photo Management**: Upload, display, and manage member photos
- **Federation & Section Management**: Organize members by geographical regions
- **Role-Based Access Control**: System admin and enrollment agent roles
- **Data Export**: CSV and Excel export capabilities
- **Bulk Import**: Import members from CSV/Excel files

### Technical Features
- **Bilingual Support**: Full French/English internationalization
- **Offline Capabilities**: Progressive Web App (PWA) with offline storage
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Security**: Session-based authentication with role-based permissions
- **Real-time Updates**: Live data synchronization across sessions

### Communication System
- **Direct Messaging**: User-to-user communication
- **Group Messaging**: Broadcast messages to filtered groups
- **Email Integration**: SendGrid integration for notifications
- **Message Status Tracking**: Read/unread status monitoring

## 🏗️ Technology Stack

### Frontend
- **React 18+** with TypeScript
- **Vite** for build tooling and development
- **TailwindCSS** with shadcn/ui components
- **TanStack Query** for server state management
- **Wouter** for client-side routing
- **react-i18next** for internationalization
- **React Hook Form** with Zod validation

### Backend
- **Node.js 20+** with TypeScript
- **Express.js** web framework
- **Drizzle ORM** with PostgreSQL
- **Session-based authentication** with express-session
- **Multer** for file uploads
- **SendGrid** for email services
- **PDFKit** for document generation

### Database & Storage
- **PostgreSQL 14+** (compatible with Neon serverless)
- **Local file system** for photo storage
- **IndexedDB** for offline client storage
- **Session storage** with MemoryStore

## 🚀 Quick Start

### Prerequisites
- Node.js 20 or higher
- PostgreSQL 14 or higher
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/appadhesionudrg.git
cd appadhesionudrg
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

4. **Database setup**
```bash
# Create your PostgreSQL database
createdb udrg_database

# Push database schema
npm run db:push
```

5. **Create upload directory**
```bash
mkdir -p uploads
chmod 755 uploads
```

6. **Start development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📦 Production Deployment

### Quick Production Build
```bash
npm run build
npm run start
```

### VPS Deployment
For detailed VPS deployment instructions, see:
- `CPANEL_VPS_MIGRATION_GUIDE.md` - Complete cPanel/WHM deployment guide
- `QUICK_MIGRATION_STEPS.md` - 30-minute quick deployment guide
- `production-deploy.sh` - Automated deployment script

### Environment Variables

Required environment variables for production:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/udrg_database
SESSION_SECRET=your_super_secure_session_secret
SENDGRID_API_KEY=your_sendgrid_api_key (optional)
```

## 🗂️ Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── lib/           # Utility functions and configurations
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend Express application
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema and Zod validation
├── uploads/               # File upload directory
└── migration-docs/       # Deployment and migration guides
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## 🌍 Internationalization

The application supports both French and English:
- Default language: French
- Language switching via UI toggle
- Complete translation coverage for all user interfaces
- Localized date formatting and number display

## 🔐 Security Features

- **Session-based authentication** with secure cookies
- **Role-based access control** (system admin, enrollment agents)
- **CORS protection** and security headers
- **File upload validation** and sanitization
- **SQL injection prevention** via parameterized queries
- **XSS protection** with content security policies

## 📱 Offline Support

- **Progressive Web App** capabilities
- **Service Worker** for asset caching
- **IndexedDB** for offline data storage
- **Request queuing** for offline operations
- **Automatic synchronization** when connection returns

## 🎯 Key Features in Detail

### Member Management
- Complete member registration with photo upload
- Advanced search and filtering capabilities
- Duplicate detection and prevention
- Member card generation with QR codes
- Data validation and error handling

### Administrative Features
- Federation and section management
- User account creation and management
- Statistical reporting and analytics
- Bulk operations and data import/export
- System monitoring and health checks

### Communication System
- Direct messaging between users
- Group messaging with advanced filtering
- Email notifications via SendGrid
- Message history and status tracking
- Real-time updates and notifications

## 🔄 Data Migration

The system includes comprehensive migration tools:
- **export-replit-data.js** - Export data from development environment
- **Database migration scripts** - Handle schema changes
- **File migration tools** - Transfer uploaded content
- **Backup and restore utilities** - Production data management

## 🆘 Troubleshooting

### Common Issues

**Application won't start:**
```bash
# Check Node.js version
node --version  # Should be 18+

# Check logs
npm run dev
```

**Database connection issues:**
```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql $DATABASE_URL
```

**Build failures:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support & Contributing

### Getting Help
- Check the troubleshooting section above
- Review deployment guides in migration documentation
- Ensure all prerequisites are met

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏢 About UDRG

The Union des Démocrates Pour La Renaissance de la Guinée (UDRG) is a political party committed to democratic governance and national development in Guinea. This membership management system supports the party's organizational needs and member engagement efforts.

---

**Version**: 2.0  
**Last Updated**: July 29, 2025  
**Node.js**: 20+  
**Database**: PostgreSQL 14+