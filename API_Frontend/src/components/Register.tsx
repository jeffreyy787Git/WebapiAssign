import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from './common/http-common';

const Register: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    if (values.password !== values.confirmPassword) {
      message.error('Password and confirm password do not match!');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${api.uri}/users/register`, {
        username: values.username,
        email: values.email,
        password: values.password,
      });
      message.success(response.data.message || 'Registration successful! Please login.');
      navigate('/login');
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        message.error(error.response.data.message || 'Registration failed. Please try again later.');
      } else {
        message.error('An unknown error occurred during registration.');
      }
      console.error("Registration error:", error);
    }
    setLoading(false);
  };

  return (
    <Form
      form={form}
      name="register"
      onFinish={onFinish}
      scrollToFirstError
      layout="vertical"
      style={{ maxWidth: '400px', margin: '50px auto' }}
    >
      <h2 style={{ textAlign: 'center' }}>Register a new account</h2>
      <Form.Item
        name="username"
        label="Username"
        rules={[
          { required: true, message: 'Please enter your username!', whitespace: true },
          { min: 3, message: 'Username must be at least 3 characters long!' }
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="email"
        label="Email"
        rules={[
          { type: 'email', message: 'Invalid email address!' },
          { required: true, message: 'Please enter your email address!' },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="password"
        label="Password"
        rules={[
          { required: true, message: 'Please enter your password!' },
          { min: 6, message: 'Password must be at least 6 characters long!' }
        ]}
        hasFeedback
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="Confirm Password"
        dependencies={['password']}
        hasFeedback
        rules={[
          { required: true, message: 'Please confirm your password!' },
          ({
            validator(_, value) {
              if (!value || form.getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('The passwords do not match!'));
            },
          }),
        ]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
          Register
        </Button>
      </Form.Item>
      <div style={{ textAlign: 'center' }}>
        Already have an account? <Link to="/login">Go to login</Link>
      </div>
    </Form>
  );
};

export default Register; 