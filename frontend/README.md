# Lexplain Frontend

Next.js application providing a modern, responsive interface for legal document analysis and AI-powered chat.

## 🏗️ Architecture Overview

The frontend is built with Next.js 14 using the App Router, TypeScript, and Tailwind CSS. It provides a seamless user experience for document upload, AI chat, and artifact viewing.

```
User Flow:
Landing → Auth → Upload → Processing → Chat → Analysis → Export
```

## 📁 File Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   │   └── page.tsx       # Sign in/up page
│   ├── chat/              # Chat interface
│   │   └── [sessionId]/   # Dynamic chat session page
│   │       └── page.tsx   # Main chat interface
│   ├── globals.css        # Global styles and Tailwind imports
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx          # Landing page
├── components/            # Reusable UI components
│   ├── ui/               # Basic UI components
│   ├── magicui/          # Animated UI components
│   │   ├── hyper-text.tsx        # Animated text for landing
│   │   ├── sparkles-text.tsx     # Sparkle animation
│   │   └── interactive-hover-button.tsx
│   ├── ArtifactCard.tsx          # Legal analysis display
│   ├── ComparisonArtifactCard.tsx # Document comparison results
│   ├── DocumentUpload.tsx        # Upload interface with drag/drop
│   ├── AuthForm.tsx             # Authentication forms
│   ├── AuthContext.tsx          # Firebase auth context
│   └── ProtectedRoute.tsx       # Route protection wrapper
├── lib/                   # Utility functions
│   └── utils.ts          # Common utilities and helpers
├── public/               # Static assets
│   └── landing_page.png  # Landing page illustration
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
├── next.config.js        # Next.js configuration
├── .env.example         # Environment variables template
└── README.md            # This file
```

## 🎨 Core Components

### Landing Page (`app/page.tsx`)
**Purpose:** Welcome page with animated elements and call-to-action

**Features:**
- Animated title with `HyperText` component
- Responsive grid layout
- Interactive hover button
- Professional gradient overlays

**Key Components:**
- `HyperText` - Scrambling text animation for "DEMYSTIFY"
- `SparklesText` - Animated sparkles on "AI"
- `InteractiveHoverButton` - Enhanced button with hover effects

### Authentication (`app/auth/page.tsx`, `components/AuthForm.tsx`)
**Purpose:** User authentication with Firebase

**Features:**
- Email/password authentication
- Google Sign-In integration
- Form validation and error handling
- Responsive design

**Auth Flow:**
1. User enters credentials
2. Firebase authentication
3. Token stored in context
4. Redirect to upload page

### Chat Interface (`app/chat/[sessionId]/page.tsx`)
**Purpose:** Main application interface for document interaction

**Features:**
- Real-time chat with AI streaming responses
- Document processing status display
- Artifact cards for summaries and analysis
- Responsive layout with sidebar
- Enhanced markdown rendering

**Key Sections:**
- **Chat Area:** Message history with streaming responses
- **Artifact Panel:** Document summaries, legal analysis, comparisons
- **Status Display:** Real-time processing updates via WebSocket

**Markdown Enhancement:**
- Custom ReactMarkdown components
- Styled headers, lists, and code blocks
- Enhanced readability with proper spacing
- Blue color theme for consistency

### Document Upload (`components/DocumentUpload.tsx`)
**Purpose:** File upload interface with drag/drop support

**Features:**
- Drag and drop file upload
- Multiple file selection for comparison
- File type validation (PDF, images, text)
- Upload progress indication
- Error handling and user feedback

**Supported Formats:**
- PDF documents
- Image files (PNG, JPG, JPEG)
- Text files (TXT)

**Upload Flow:**
1. User selects/drops files
2. Client-side validation
3. Upload to backend API
4. Real-time processing status
5. Redirect to chat interface

### Artifact Cards (`components/ArtifactCard.tsx`, `components/ComparisonArtifactCard.tsx`)
**Purpose:** Display AI-generated analysis and summaries

**Features:**
- Responsive card layout
- Collapsible sections
- Export functionality
- Markdown content rendering
- Professional styling

**Artifact Types:**
- **Document Summary:** Plain-English overview
- **Legal Analysis:** Key terms, risks, important clauses
- **Document Comparison:** Side-by-side analysis

### Authentication Context (`components/AuthContext.tsx`)
**Purpose:** Global authentication state management

**Features:**
- Firebase user state management
- Token refresh handling
- Loading states
- Error handling

**Usage:**
```tsx
const { user, loading, signIn, signOut } = useAuth();
```

### Protected Routes (`components/ProtectedRoute.tsx`)
**Purpose:** Route protection for authenticated pages

**Features:**
- Authentication verification
- Automatic redirects
- Loading states
- Error boundaries

## 🎯 Key Features

### Real-time Chat
- **Streaming Responses:** AI responses stream in real-time using Server-Sent Events
- **Markdown Rendering:** Full markdown support with custom styling
- **Message History:** Persistent chat history stored in Firestore
- **Status Updates:** Real-time document processing status via WebSocket

### Document Processing
- **Upload Interface:** Intuitive drag/drop with multiple file support
- **Processing Status:** Real-time updates during document analysis
- **Error Handling:** Comprehensive error messages and recovery options
- **File Validation:** Client-side validation for supported formats

### Responsive Design
- **Mobile First:** Optimized for mobile devices
- **Tablet Support:** Adapted layouts for tablet screens
- **Desktop Enhancement:** Full feature set on larger screens
- **Touch Friendly:** Optimized touch targets and gestures

### Performance Optimization
- **Code Splitting:** Automatic code splitting with Next.js
- **Image Optimization:** Next.js Image component for optimal loading
- **Lazy Loading:** Components loaded on demand
- **Caching:** API responses cached with React Query patterns

## 🚀 Getting Started

### 1. Installation

```bash
# Install dependencies
npm install

# or with yarn
yarn install
```

### 2. Environment Configuration

Create `.env.local` from `.env.example`:

```bash
# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Optional: Analytics
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Firebase Setup

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project
   - Enable Authentication

2. **Configure Authentication:**
   - Enable Email/Password provider
   - Enable Google Sign-In provider
   - Set authorized domains

3. **Get Configuration:**
   - Go to Project Settings
   - Copy web app configuration
   - Add to `.env.local`

### 4. Development Server

```bash
# Start development server
npm run dev

# or with yarn
yarn dev
```

Visit `http://localhost:3000` to see the application.

## 🎨 Styling and Design

### Tailwind CSS Configuration
- **Custom Colors:** Extended color palette for brand consistency
- **Typography:** Custom font scales and line heights
- **Spacing:** Consistent spacing system
- **Responsive Breakpoints:** Mobile-first responsive design

### Component Styling
- **Consistent Patterns:** Reusable styling patterns across components
- **Color Themes:** Blue-based theme for professional appearance
- **Interactive States:** Hover, focus, and active states for all interactive elements
- **Accessibility:** ARIA labels and keyboard navigation support

### Animation and Interactions
- **Framer Motion:** Smooth animations and transitions
- **Loading States:** Skeleton loaders and progress indicators
- **Micro-interactions:** Button hover effects and state changes
- **Performance:** Optimized animations for smooth performance

## 🔧 Configuration

### Next.js Configuration (`next.config.js`)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration options
  experimental: {
    appDir: true
  },
  images: {
    domains: ['example.com'] // Add your image domains
  }
}
```

### TypeScript Configuration (`tsconfig.json`)
- Strict type checking enabled
- Path mapping for clean imports
- Next.js specific configurations

### Tailwind Configuration (`tailwind.config.js`)
- Custom color palette
- Extended spacing and typography
- Plugin integrations

## 🚀 Deployment

### Vercel Deployment (Recommended)
1. **Connect Repository:**
   - Connect GitHub repository to Vercel
   - Automatic deployments on push to main

2. **Environment Variables:**
   - Add all environment variables in Vercel dashboard
   - Use production Firebase configuration

3. **Domain Configuration:**
   - Set up custom domain if needed
   - Configure DNS settings

### Netlify Deployment
1. **Build Settings:**
   ```bash
   # Build command
   npm run build
   
   # Publish directory
   out
   ```

2. **Environment Variables:**
   - Add environment variables in Netlify dashboard

### Manual Deployment
```bash
# Build for production
npm run build

# Export static files (if using static export)
npm run export

# Start production server
npm start
```

## 🧪 Testing

### Component Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### E2E Testing
```bash
# Install Playwright
npm install @playwright/test

# Run E2E tests
npm run test:e2e
```

### Manual Testing Checklist
- [ ] Authentication flow (sign up, sign in, sign out)
- [ ] Document upload (various file types)
- [ ] Chat functionality (questions and responses)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Error handling (network errors, invalid files)

## 🔒 Security

### Authentication Security
- **Token Management:** Secure token storage and refresh
- **Route Protection:** Protected routes require authentication
- **Session Management:** Automatic session cleanup

### Data Security
- **Input Validation:** Client-side validation for all inputs
- **XSS Prevention:** Sanitized user content
- **HTTPS Only:** Force HTTPS in production

### Privacy
- **Data Minimization:** Only collect necessary user data
- **Consent Management:** Clear privacy policy and terms
- **User Control:** Users can delete their data

## 📊 Performance

### Metrics
- **Core Web Vitals:** Optimized for Google's Core Web Vitals
- **Bundle Size:** Monitored and optimized bundle sizes
- **Loading Performance:** Fast initial page loads
- **Runtime Performance:** Smooth interactions and animations

### Optimization Techniques
- **Code Splitting:** Automatic route-based code splitting
- **Image Optimization:** Next.js Image component with optimization
- **Asset Optimization:** Compressed and optimized static assets
- **Caching:** Aggressive caching strategies for static content

### Monitoring
- **Web Vitals:** Monitor Core Web Vitals in production
- **Error Tracking:** Comprehensive error tracking and reporting
- **Analytics:** User behavior and performance analytics

## 🐛 Troubleshooting

### Common Issues

**Authentication Not Working:**
```
Error: Firebase configuration invalid
```
- Verify Firebase configuration in `.env.local`
- Check Firebase project settings
- Ensure authentication providers are enabled

**API Connection Issues:**
```
Error: Network request failed
```
- Verify `NEXT_PUBLIC_BACKEND_URL` is correct
- Check backend server is running
- Verify CORS configuration in backend

**Build Failures:**
```
Error: Type error in component
```
- Check TypeScript types are correct
- Verify all imports are valid
- Run type checking: `npm run type-check`

**Styling Issues:**
```
Error: Tailwind classes not working
```
- Verify Tailwind CSS is properly configured
- Check if custom styles conflict with Tailwind
- Clear Next.js cache: `rm -rf .next`

### Development Tips

**Hot Reload Issues:**
- Restart development server
- Clear browser cache
- Check for TypeScript errors

**Performance Issues:**
- Use React DevTools Profiler
- Check for unnecessary re-renders
- Optimize images and assets

**State Management:**
- Use React DevTools for state debugging
- Verify context providers are properly configured
- Check for memory leaks in useEffect hooks

## 🤝 Contributing

### Code Style
- **ESLint:** Follow ESLint configuration
- **Prettier:** Consistent code formatting
- **TypeScript:** Strong typing for all components
- **Component Structure:** Follow established patterns

### Adding New Features
1. Create feature branch from main
2. Implement component with TypeScript
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

### Component Guidelines
- Use functional components with hooks
- Implement proper TypeScript types
- Include accessibility features
- Follow responsive design patterns

---

**Note:** This frontend is designed to work with the Lexplain backend API. Ensure both components are properly configured and the backend is running for full functionality.
