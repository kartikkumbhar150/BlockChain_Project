import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import VerifyPage from './pages/verify'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/verify/:code" element={<VerifyPage />} />
          <Route path="/" element={<div className="p-8">Homepage</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
