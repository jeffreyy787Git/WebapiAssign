import React, { useEffect } from "react";
import { Form, Input, Button, message } from 'antd';
import axios from "axios";
import { api } from './common/http-common';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input

const NewArticles = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('atoken');
    if (!token) {
      message.warning('Please login to publish a new article.');
      navigate('/login');
    }
  }, [navigate]);

  const handleFormSubmit = (values: any) => {
    const token = localStorage.getItem('atoken');
    if (!token) {
      message.error('Invalid authentication, please login again.');
      navigate('/login');
      return;
    }

    const t = values.title;
    const c = values.context;
    console.log(values, t, c);
    const postArticle = {
      title: t,
      alltext: c,
    }
    
    axios.post(`${api.uri}/articles`, postArticle, {
      headers: {
        'Authorization': `Basic ${token}`
      }
    }).then((res)=> {
      console.log(res.data);
      message.success('Article published successfully!');
      navigate('/');
    }).catch(error => {
      console.error("Publish article failed:", error);
      if (error.response && error.response.status === 401) {
        message.error('Authentication failed or expired, please login again.');
        navigate('/login');
      } else {
        message.error('Publish article failed, please try again later.');
      }
    });
  }

  const contentRules = [
    {required: true, message: 'Please input somethings'}    
  ]
  
  return (
    <Form name="article" onFinish={(values)=>handleFormSubmit(values)}>
      <Form.Item name="title" label="Title" rules={contentRules}>
        <Input />
      </Form.Item>
      <Form.Item name="context" label="Context" rules={contentRules}>
        <TextArea rows={4} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">Submit</Button>
      </Form.Item>
    </Form>
  )
}

export default NewArticles;



