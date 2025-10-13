# Design Document

## Overview

The React Native mobile application will provide a native mobile interface for the WhatsApp Business automation platform, enabling business owners and managers to monitor conversations, manage products, and configure AI settings on-the-go. The app will leverage the existing NestJS backend API and maintain feature parity with critical web dashboard functionality while optimizing for mobile user experience.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                         │
├─────────────────────────────────────────────────────────────┤
│  Navigation Layer (React Navigation)                        │
├─────────────────────────────────────────────────────────────┤
│  Screen Components                                          │
│  ├── Auth Screens        ├── Dashboard       ├── Settings  │
│  ├── Conversations      ├── Products        ├── AI Config  │
├─────────────────────────────────────────────────────────────┤
│  State Management (Zustand + React Query)                  │
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                             │
│  ├── API Client         ├── Auth Service    ├── Storage    │
│  ├── Push Notifications ├── Offline Cache   ├── Image      │
├─────────────────────────────────────────────────────────────┤
│  Native Modules & Libraries                                 │
│  ├── AsyncStorage       ├── NetInfo         ├── Camera     │
│  ├── Push Notifications ├── Keychain       ├── Image Picker│
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              Existing NestJS Backend API                    │
│  ├── WhatsApp Module    ├── Products Module                │
│  ├── AI Module          ├── Conversations Module           │
│  ├── Dashboard Module   ├── Database (PostgreSQL)          │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Framework**: React Native 0.74+ with TypeScript
- **Navigation**: React Navigation 6.x with native stack
- **State Management**: Zustand for global state + React Query for server state
- **HTTP Client**: Axios with interceptors for authentication and retry logic
- **UI Components**: React Native Elements + custom components
- **Storage**: AsyncStorage for app data, Keychain for secure credentials
- **Push Notifications**: React Native Firebase (FCM)
- **Offline Support**: React Query with persistence + AsyncStorage
- **Image Handling**: React Native Image Picker + React Native Fast Image
- **Network Detection**: NetInfo for connectivity monitoring

## Components and Interfaces

### Core Screen Components

#### 1. Authentication Screens
```typescript
// LoginScreen.tsx
interface LoginScreenProps {
  navigation: NavigationProp<AuthStackParamList, 'Login'>
}

interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

// Components: LoginForm, ForgotPasswordLink, BiometricLogin (future)
```

#### 2. Dashboard Screen
```typescript
// DashboardScreen.tsx
interface DashboardScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Dashboard'>
}

interface DashboardData {
  metrics: ConversationMetrics
  recentActivity: RecentInteraction[]
  systemHealth: SystemHealth
}

// Components: MetricsCards, RecentActivityList, QuickActions, RefreshControl
```

#### 3. Conversations Screen
```typescript
// ConversationsScreen.tsx
interface ConversationsScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Conversations'>
}

// ConversationDetailScreen.tsx
interface ConversationDetailProps {
  route: RouteProp<ConversationStackParamList, 'Detail'>
  navigation: NavigationProp<ConversationStackParamList, 'Detail'>
}

// Components: ConversationList, MessageBubble, MessageInput, EscalationBanner
```

#### 4. Products Screen
```typescript
// ProductsScreen.tsx
interface ProductsScreenProps {
  navigation: NavigationProp<MainTabParamList, 'Products'>
}

// ProductDetailScreen.tsx
interface ProductDetailProps {
  route: RouteProp<ProductStackParamList, 'Detail'>
  navigation: NavigationProp<ProductStackParamList, 'Detail'>
}

// Components: ProductGrid, ProductCard, SearchBar, CategoryFilter, ImageCarousel
```

#### 5. AI Configuration Screen
```typescript
// AIConfigScreen.tsx
interface AIConfigScreenProps {
  navigation: NavigationProp<MainTabParamList, 'AIConfig'>
}

interface AIConfigData {
  currentGoal: ConversationGoal
  confidenceThreshold: number
  businessHours: BusinessHours
  trainingExamples: ConversationExample[]
}

// Components: GoalSelector, ThresholdSlider, BusinessHoursConfig, TrainingExamplesList
```

### Service Layer Interfaces

#### 1. API Client Service
```typescript
// services/ApiClient.ts
class MobileApiClient extends ApiClient {
  private authToken: string | null = null
  private refreshToken: string | null = null
  
  // Enhanced mobile-specific methods
  async authenticateWithBiometrics(): Promise<AuthResult>
  async refreshAuthToken(): Promise<string>
  async syncOfflineData(): Promise<SyncResult>
  async uploadImageWithProgress(file: ImageFile, onProgress: (progress: number) => void): Promise<string>
}

interface AuthResult {
  success: boolean
  token: string
  refreshToken: string
  user: UserProfile
}

interface SyncResult {
  success: boolean
  syncedItems: number
  conflicts: SyncConflict[]
}
```

#### 2. Offline Storage Service
```typescript
// services/OfflineStorage.ts
interface OfflineStorageService {
  // Cache management
  cacheConversations(conversations: Conversation[]): Promise<void>
  getCachedConversations(): Promise<Conversation[]>
  cacheProducts(products: Product[]): Promise<void>
  getCachedProducts(): Promise<Product[]>
  
  // Offline actions queue
  queueAction(action: OfflineAction): Promise<void>
  getQueuedActions(): Promise<OfflineAction[]>
  clearQueuedActions(): Promise<void>
}

interface OfflineAction {
  id: string
  type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'SEND_MESSAGE' | 'UPDATE_AI_CONFIG'
  payload: any
  timestamp: Date
  retryCount: number
}
```

#### 3. Push Notification Service
```typescript
// services/PushNotificationService.ts
interface PushNotificationService {
  initialize(): Promise<void>
  requestPermissions(): Promise<boolean>
  getDeviceToken(): Promise<string>
  subscribeToTopic(topic: string): Promise<void>
  handleNotificationReceived(notification: Notification): void
  handleNotificationOpened(notification: Notification): void
}

interface NotificationPayload {
  type: 'CONVERSATION_ESCALATED' | 'LOW_AI_CONFIDENCE' | 'SYSTEM_ERROR'
  conversationId?: string
  message: string
  priority: 'high' | 'normal' | 'low'
}
```

## Data Models

### Enhanced Mobile-Specific Models

```typescript
// types/mobile.ts
interface MobileAppState {
  isOnline: boolean
  lastSyncTime: Date | null
  pendingActions: number
  authStatus: 'authenticated' | 'unauthenticated' | 'refreshing'
}

interface CachedData<T> {
  data: T
  timestamp: Date
  expiresAt: Date
  isStale: boolean
}

interface ImageUploadProgress {
  id: string
  progress: number
  status: 'uploading' | 'completed' | 'failed'
  error?: string
}

interface BiometricConfig {
  isEnabled: boolean
  type: 'fingerprint' | 'face' | 'none'
  fallbackToPin: boolean
}
```

### Navigation Types

```typescript
// types/navigation.ts
type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>
  Main: NavigatorScreenParams<MainTabParamList>
}

type AuthStackParamList = {
  Login: undefined
  ForgotPassword: undefined
}

type MainTabParamList = {
  Dashboard: undefined
  Conversations: NavigatorScreenParams<ConversationStackParamList>
  Products: NavigatorScreenParams<ProductStackParamList>
  AIConfig: undefined
  Settings: undefined
}

type ConversationStackParamList = {
  List: undefined
  Detail: { conversationId: string }
  Search: undefined
}

type ProductStackParamList = {
  List: undefined
  Detail: { productId: string }
  Create: undefined
  Edit: { productId: string }
}
```

## Error Handling

### Error Handling Strategy

```typescript
// utils/ErrorHandler.ts
interface ErrorHandler {
  handleApiError(error: ApiError): void
  handleNetworkError(error: NetworkError): void
  handleAuthError(error: AuthError): void
  showUserFriendlyError(error: AppError): void
}

interface AppError {
  code: string
  message: string
  userMessage: string
  severity: 'low' | 'medium' | 'high'
  recoverable: boolean
}

// Error boundaries for React components
class GlobalErrorBoundary extends React.Component<Props, State> {
  // Catches JavaScript errors anywhere in the child component tree
}
```

### Offline Error Handling

```typescript
// utils/OfflineErrorHandler.ts
interface OfflineErrorHandler {
  handleOfflineAction(action: OfflineAction): Promise<void>
  retryFailedActions(): Promise<void>
  showOfflineMessage(): void
  showSyncConflictDialog(conflicts: SyncConflict[]): void
}
```

## Testing Strategy

### Testing Approach

#### 1. Unit Testing
- **Framework**: Jest + React Native Testing Library
- **Coverage**: Services, utilities, custom hooks, and business logic
- **Mock Strategy**: Mock external dependencies (API calls, native modules)

```typescript
// __tests__/services/ApiClient.test.ts
describe('MobileApiClient', () => {
  it('should handle authentication flow correctly', async () => {
    // Test authentication with proper token management
  })
  
  it('should queue actions when offline', async () => {
    // Test offline action queuing
  })
})
```

#### 2. Integration Testing
- **Framework**: Detox for E2E testing
- **Scenarios**: Critical user flows (login, view conversations, send message)
- **Device Testing**: iOS and Android simulators/emulators

```typescript
// e2e/loginFlow.e2e.ts
describe('Login Flow', () => {
  it('should login successfully with valid credentials', async () => {
    await element(by.id('email-input')).typeText('user@example.com')
    await element(by.id('password-input')).typeText('password')
    await element(by.id('login-button')).tap()
    await expect(element(by.id('dashboard-screen'))).toBeVisible()
  })
})
```

#### 3. Component Testing
- **Framework**: React Native Testing Library
- **Focus**: UI components, user interactions, accessibility

```typescript
// __tests__/components/ConversationList.test.tsx
describe('ConversationList', () => {
  it('should render conversations correctly', () => {
    // Test component rendering with mock data
  })
  
  it('should handle pull-to-refresh', async () => {
    // Test refresh functionality
  })
})
```

### Performance Testing

#### 1. Memory Usage Monitoring
- Monitor memory leaks in long-running screens
- Test image loading and caching performance
- Validate offline data storage efficiency

#### 2. Network Performance
- Test API response times with different network conditions
- Validate offline-to-online sync performance
- Monitor data usage for mobile networks

#### 3. UI Performance
- Test scroll performance in large lists (conversations, products)
- Validate navigation transitions smoothness
- Monitor app startup time

### Security Testing

#### 1. Authentication Security
- Test token storage security (Keychain integration)
- Validate session management and refresh logic
- Test biometric authentication flow

#### 2. Data Protection
- Test sensitive data encryption at rest
- Validate secure API communication (HTTPS)
- Test offline data security

#### 3. Input Validation
- Test form validation and sanitization
- Validate file upload security (images)
- Test deep link security

### Accessibility Testing

#### 1. Screen Reader Support
- Test VoiceOver (iOS) and TalkBack (Android) compatibility
- Validate proper accessibility labels and hints
- Test navigation with assistive technologies

#### 2. Visual Accessibility
- Test color contrast ratios
- Validate font scaling support
- Test high contrast mode compatibility

#### 3. Motor Accessibility
- Test touch target sizes (minimum 44pt)
- Validate gesture alternatives
- Test switch control compatibility

### Testing Infrastructure

```typescript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-navigation)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### Continuous Integration

```yaml
# .github/workflows/mobile-ci.yml
name: Mobile CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:lint
      - run: npm run test:type-check
  
  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npx detox build --configuration ios.sim.debug
      - run: npx detox test --configuration ios.sim.debug
  
  e2e-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npx detox build --configuration android.emu.debug
      - run: npx detox test --configuration android.emu.debug
```