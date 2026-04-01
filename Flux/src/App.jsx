import { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar    from './components/layout/Navbar'
import Sidebar   from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import ConvertModal from './components/ConvertModal'
import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import Flashcards from './pages/Flashcards'
import Quiz      from './pages/Quiz'
import Library   from './pages/Library'
import Recent    from './pages/Recent'
import Settings  from './pages/Settings'

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth()
  return currentUser ? children : <Navigate to="/login" replace />
}

function AppLayout({ children }) {
  const [uploadFile,  setUploadFile]  = useState(null)
  const [modalOpen,   setModalOpen]   = useState(false)

  function handleUploadClick() {
    // Trigger hidden file input
    const input = document.createElement('input')
    input.type  = 'file'
    input.accept = '.pdf'
    input.onchange = e => {
      const file = e.target.files[0]
      if (file) { setUploadFile(file); setModalOpen(true) }
    }
    input.click()
  }

  function handleModalClose() {
    setModalOpen(false)
    setUploadFile(null)
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar   onUploadClick={handleUploadClick} />
      <Sidebar  onUploadClick={handleUploadClick} />
      <BottomNav onUploadClick={handleUploadClick} />

      <div className="md:ml-64 pt-24 pb-28 md:pb-12 px-4 md:px-10">
        <main className="max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      <ConvertModal
        open={modalOpen}
        file={uploadFile}
        onClose={handleModalClose}
      />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/library" element={
        <ProtectedRoute>
          <AppLayout><Library /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/recent" element={
        <ProtectedRoute>
          <AppLayout><Recent /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <AppLayout><Settings /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/flashcards/:setId" element={
        <ProtectedRoute>
          <AppLayout><Flashcards /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/quiz/:setId" element={
        <ProtectedRoute>
          <AppLayout><Quiz /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
