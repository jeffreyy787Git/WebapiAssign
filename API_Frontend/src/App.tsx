import { Layout, Space, Button, message } from 'antd';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import React, { useContext } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Favourites from './components/Favourites';
import UserMessages from './components/UserMessages';
import ThreadDetails from './components/ThreadDetails';
import { AuthProvider, AuthContext } from './components/AuthContext';
import HotelPage from './components/Hotels';

const { Header, Content, Footer } = Layout;

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
        <Link to="/">Hotel</Link>
        {isAuthenticated ? (
          <>
            <Link to="/favourites">Favourites</Link>
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
              <Route index element={ <HotelPage /> } />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
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