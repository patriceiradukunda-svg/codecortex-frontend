import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatProvider } from '@/contexts/ChatContext'
import App from '@/pages/App'
import AdminPage from '@/pages/AdminPage'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ChatProvider>
              <Routes>
                <Route path="/" element={<App />} />
                <Route path="/admin" element={<AdminPage />} />
              </Routes>
              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#1e1e1e',
                    color: '#f5f5f5',
                    border: '1px solid #2c2c2c',
                    borderRadius: '12px',
                    fontSize: '13px',
                  },
                  success: { iconTheme: { primary: '#7B3F00', secondary: '#fff' } },
                }}
              />
            </ChatProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
)
