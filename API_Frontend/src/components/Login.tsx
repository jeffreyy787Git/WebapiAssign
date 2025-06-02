import React, { useState, useContext } from 'react';
import { Form, Input, Button, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { Buffer } from 'buffer';
import axios from 'axios';
import { AuthContext, User as AuthUser } from './AuthContext';
import { api } from './common/http-common';

interface LoginResponse {
  message: string;
  user: AuthUser;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("AuthContext must be used within an AuthProvider");
  }
  const { setIsAuthenticated, setUser } = authContext;

  const onFinish = async (values: any) => {
    setLoading(true);
    const { username, password } = values;
    
    if (!username || !password) {
        message.error('Please enter your username and password');
        setLoading(false);
        return;
    }

    const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');

    try {
      const response = await axios.post<LoginResponse>(
        `${api.uri}/auth/login`, 
        {},
        {
          headers: {
            'Authorization': `Basic ${token}`
          }
        }
      );

      if (response.status === 200 && response.data && response.data.user) {
        localStorage.setItem('atoken', token);
        setIsAuthenticated(true);
        if (setUser) {
            setUser(response.data.user);
        } else {
            console.warn("AuthContext.setUser is not available. User context might not be properly set.");
        }
        message.success(response.data.message || 'Login successful');
        navigate('/');
      } else {
        const errorData = response.data as any;
        message.error(errorData?.message || 'Login failed: Unexpected server response.');
      }
    } catch (error: any) {
      if (error.isAxiosError === true) {
        if (error.response) {
          const errorData = error.response.data as { message?: string };
          message.error(errorData?.message || `Login failed: ${error.response.status} ${error.response.statusText}`);
        } else if (error.request) {
          message.error('Login failed: No response from server. Check network connection.');
        }
      } else {
        message.error('Login attempt failed. Please check your input or network connection.');
        console.error("Login API error (not an Axios error or request setup issue):", error.message ? error.message : error);
      }
    }
    setLoading(false);
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
    message.error('Login failed: Please check your input fields for errors.');
  };

  return (
    <Form 
      requiredMark={false}
      name="login"
      initialValues={{ remember: true }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
      style={{ maxWidth: 600, margin: '50px auto' }}
    >
      <Form.Item
        label="Username"
        name="username"
        rules={[{ required: true, message: 'Please enter your username!' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true, message: 'Please enter your password!' }]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
          Login
        </Button>
      </Form.Item>
      <div style={{ textAlign: 'center' }}>
        Do not have an account? <Link to="/register">Go to register</Link>
      </div>  
    </Form>
  );
};
export default Login; 