import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/authcontext';
import React from 'react';

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
};

const Login = React.lazy(() => import('../pages/login'));
const Dashboard = React.lazy(() => import('../pages/dashboard'));
const CaseList = React.lazy(() => import('../pages/caselist'));
const CaseNew = React.lazy(() => import('../pages/casenew'));
const CaseDetail = React.lazy(() => import('../pages/casedetail'));
const Dispatch = React.lazy(() => import('../pages/dispatch'));
const MyTasks = React.lazy(() => import('../pages/mytasks'));
const Stats = React.lazy(() => import('../pages/stats'));
const DepartmentConfig = React.lazy(() => import('../pages/config/departments'));
const UserConfig = React.lazy(() => import('../pages/config/users'));
const PendingQueue = React.lazy(() => import('../pages/pendingQueue'));
const PublicLogin = React.lazy(() => import('../pages/public/login'));
const PublicHome = React.lazy(() => import('../pages/public/home'));
const PublicSubmit = React.lazy(() => import('../pages/public/submit'));
const PublicQuery = React.lazy(() => import('../pages/public/query'));

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/public/login" element={<PublicLogin />} />
      <Route path="/public/home" element={<PublicHome />} />
      <Route path="/public/submit" element={<PublicSubmit />} />
      <Route path="/public/query" element={<PublicQuery />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute roles={['admin', 'supervisor']}><CaseList /></ProtectedRoute>} />
      <Route path="/cases/new" element={<ProtectedRoute roles={['admin', 'supervisor']}><CaseNew /></ProtectedRoute>} />
      <Route path="/cases/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
      <Route path="/dispatch" element={<ProtectedRoute roles={['admin', 'supervisor']}><Dispatch /></ProtectedRoute>} />
      <Route path="/pending" element={<ProtectedRoute roles={['admin', 'supervisor']}><PendingQueue /></ProtectedRoute>} />
      <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
      <Route path="/stats" element={<ProtectedRoute roles={['admin', 'supervisor']}><Stats /></ProtectedRoute>} />
      <Route path="/config/departments" element={<ProtectedRoute roles={['admin']}><DepartmentConfig /></ProtectedRoute>} />
      <Route path="/config/users" element={<ProtectedRoute roles={['admin']}><UserConfig /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRoutes;
