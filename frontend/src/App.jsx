import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductListPage from './pages/ProductListPage';
import AddProductPage from './pages/AddProductPage';
import ProductDetailPage from './pages/ProductDetailPage';
import GenerateImagePage from './pages/GenerateImagePage';
import GenerateContentPage from './pages/GenerateContentPage';
import ImagePromptPage from './pages/ImagePromptPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/products" replace />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/new" element={<AddProductPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/products/:id/generate" element={<GenerateImagePage />} />
            <Route path="/products/:id/generate-content" element={<GenerateContentPage />} />
            <Route path="/products/:id/image-prompt" element={<ImagePromptPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
