# 🔐 Authentication Flow - How It Works

## Overview
Your Lumino AI now has a complete authentication system that prevents unauthorized access to features.

## 🛡️ Protection Mechanisms

### 1. **Protected Routes** (`App.jsx`)
All feature routes are wrapped with `ProtectedRoute` component:
- `/chat` - Text chat interface
- `/voice` - Voice conversation interface  
- `/profile-setup` - User profile customization

**How it works:**
```jsx
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};
```

If no token is found, user is automatically redirected to `/auth` (login page).

### 2. **Landing Page Guards** (`LandingPage.jsx`)
The home page cards check authentication before navigation:

**Chat Card:**
- ✅ **Logged in**: Button says "Start Chatting" → Goes to `/chat`
- ❌ **Not logged in**: Button says "Sign In to Chat" → Goes to `/auth`

**Voice Card:**
- ✅ **Logged in**: Button says "Start Talking" → Goes to `/voice`
- ❌ **Not logged in**: Button says "Sign In to Talk" → Goes to `/auth`

### 3. **Auth Page Redirect** (`AuthPage.jsx`)
If user is already logged in and tries to access `/auth`:
- Automatically redirects to `/chat`
- Prevents confusion of seeing login form when already authenticated

### 4. **API Token Validation** (`api.js`)
Every API request includes the JWT token:
```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

If backend returns 401 (Unauthorized):
- Token is cleared from localStorage
- User is redirected to `/auth`

## 🔄 Complete User Flow

### First-Time User
1. **Visit Site** → Lands on `/` (LandingPage)
2. **Click Chat/Voice** → Redirected to `/auth`
3. **Register Account** → Enter email, username, password
4. **Receive Token** → Stored in localStorage
5. **Setup Profile** → Optional personalization at `/profile-setup`
6. **Start Using** → Access to all features

### Returning User
1. **Visit Site** → Lands on `/` (LandingPage)
2. **See "Sign In"** → Click to go to `/auth`
3. **Login** → Enter email & password
4. **Receive Token** → Stored in localStorage
5. **Start Using** → Access to all features

### Logged-In User
1. **Visit Site** → Sees username in header
2. **Click Chat/Voice** → Direct access to features
3. **Token Auto-Sent** → All API calls authenticated
4. **Can Logout** → Clears token, returns to landing

### Unauthorized Access Attempts
1. **Try to visit `/chat` without token** → Redirected to `/auth`
2. **Try to visit `/voice` without token** → Redirected to `/auth`
3. **Token expires** → API returns 401 → Redirected to `/auth`
4. **Invalid token** → Rejected by backend → Must login again

## 🎯 What Users CAN Access Without Login

### Public Routes:
- ✅ `/` - Landing page (can see features, but can't use them)
- ✅ `/auth` - Login/Register page

### What They See:
- Landing page with feature cards
- "Sign In" button in header
- "Sign In to Chat/Talk" on feature cards
- Information about the app

### What They CANNOT Access:
- ❌ `/chat` - Redirected to `/auth`
- ❌ `/voice` - Redirected to `/auth`
- ❌ `/profile-setup` - Redirected to `/auth`
- ❌ API endpoints (backend rejects without token)

## 🔒 Security Features

### Frontend Security:
1. **Route Protection** - React Router redirects
2. **Conditional Rendering** - Features only show when authenticated
3. **Token Storage** - localStorage (accessible only to same domain)
4. **Auto-Logout** - On 401 responses from backend

### Backend Security:
1. **Password Hashing** - bcrypt (72 byte limit)
2. **JWT Tokens** - Cryptographically signed, 7-day expiry
3. **Token Verification** - Every protected endpoint checks token
4. **User Validation** - Checks user exists and is active

## 📱 User Experience

### When Not Logged In:
```
Landing Page:
┌─────────────────────────────────┐
│  Lumino AI         [Sign In] ←  │  Can sign in
├─────────────────────────────────┤
│  [Chat Card]                    │
│  → "Sign In to Chat" →          │  Goes to /auth
│                                 │
│  [Voice Card]                   │
│  → "Sign In to Talk" →          │  Goes to /auth
└─────────────────────────────────┘
```

### When Logged In:
```
Landing Page:
┌─────────────────────────────────┐
│  Lumino AI    user123  [Logout] │  Can logout
├─────────────────────────────────┤
│  [Chat Card]                    │
│  → "Start Chatting" →           │  Goes to /chat ✓
│                                 │
│  [Voice Card]                   │
│  → "Start Talking" →            │  Goes to /voice ✓
└─────────────────────────────────┘
```

## 🧪 Testing the Protection

### Test 1: Direct URL Access (Not Logged In)
1. Open browser in incognito mode
2. Try to go to `http://localhost:5173/chat`
3. **Expected**: Redirected to `/auth`

### Test 2: Card Click (Not Logged In)
1. Go to landing page without logging in
2. Click on Chat or Voice card
3. **Expected**: Taken to `/auth` login page

### Test 3: Logout and Access
1. Login and go to chat
2. Click logout
3. Try to click browser back button
4. **Expected**: Redirected to `/auth`

### Test 4: Token Expiry
1. Login successfully
2. Manually delete token from localStorage (DevTools)
3. Try to send a message in chat
4. **Expected**: Redirected to `/auth`

## 🎨 Visual Indicators

### Not Logged In:
- Header shows: "Sign In" button
- Cards show: "Sign In to Chat/Talk"
- Blue/Purple gradient theme

### Logged In:
- Header shows: Username + "Logout" button  
- Cards show: "Start Chatting/Talking"
- Same beautiful gradient theme

## 🚀 Ready to Test!

1. **Start Backend**: `cd backend && python -m uvicorn main:app --reload`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Test Flow**:
   - Visit `http://localhost:5173`
   - Try to access features without login
   - Register an account
   - See how access is granted
   - Logout and test again

All features are now properly protected! 🎉
