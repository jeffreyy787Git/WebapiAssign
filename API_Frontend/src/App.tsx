//import './App.css'
import { Layout, Space, Button, message } from 'antd';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import React, { useContext } from 'react';
//import Landing from "./components/Landing"
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import DetailArticle from './components/DetailArticle';
import NewArticles from './components/NewArticles';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Favourites from './components/Favourites';
import UserMessages from './components/UserMessages';
import ThreadDetails from './components/ThreadDetails';
import { AuthProvider, AuthContext } from './components/AuthContext';

const { Header, Content, Footer } = Layout;

const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    message.error("AuthProvider not found!");
    return <Navigate to="/login" replace />;
  }
  const { isAuthenticated } = authContext;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const Navigation: React.FC = () => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  if (!authContext) {
    return null; 
  }

  const { isAuthenticated, logout } = authContext;

  const handleLogout = () => {
    logout();
    message.success('Logout successful');
    navigate('/login');
  };

  return (
    <nav>
      <Space>
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        {isAuthenticated ? (
          <>
            <Link to="/favourites">Favourites</Link>
            <Link to="/newarticle">New</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/messages">Messages</Link>
            <Link to="/" onClick={handleLogout}>Logout</Link>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
          </>
        )}
      </Space>
    </nav>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Header>
          <Navigation />
        </Header>
        <Content style={{ padding: '0 50px', marginTop: 64 }}>
          <div style={{ background: '#fff', padding: 24, minHeight: 380 }}>
            <Routes>
              <Route index element={ <Home /> } />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />}  />  
              <Route path="/a/:aid" element = {<DetailArticle /> } />
              <Route 
                path="/newarticle" 
                element={
                  <ProtectedRoute>
                    <NewArticles />
                  </ProtectedRoute>
                } 
              />
              <Route path="/profile" element={<Profile />} />
              <Route path="/favourites" element={<Favourites />} />
              <Route path="/messages" element={<UserMessages />} />
              <Route path="/messages/:threadId" element={<ThreadDetails />} />
            </Routes>
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          VT6003CEM API Assignment
        </Footer>
      </Router>
    </AuthProvider>
  )
}