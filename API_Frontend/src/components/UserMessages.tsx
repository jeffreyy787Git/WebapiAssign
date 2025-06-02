import React, { useState, useEffect, useContext, useCallback } from 'react';
import { List, Typography, Spin, Alert, Button, message, Tooltip, Modal, Form, Input } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { PlusOutlined, MessageOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

export interface DisplayableMessageThread {
  id: number;
  user_id: number;
  user_username?: string;
  subject?: string | null;
  created_at: string; 
  last_message_at: string; 
  status: string;
  last_message_preview?: string | null;
  is_read_by_user: boolean;
  is_read_by_admin: boolean;
}

interface NewMessageFormValues {
  subject?: string;
  initialMessageContent: string;
}

const UserMessagesPage: React.FC = () => {
  const [threads, setThreads] = useState<DisplayableMessageThread[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [form] = Form.useForm<NewMessageFormValues>();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const authContext = useContext(AuthContext);

  const fetchThreads = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<DisplayableMessageThread[]>(
        '/api/v1/messaging/threads',
        { headers: { Authorization: `Basic ${token}` } }
      );
      setThreads(response.data);
    } catch (err: any) {
      console.error("Error fetching threads:", err);
      const errMsg = err.response?.data?.message || "Failed to fetch your messages.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('atoken');

    if (!authContext || authContext.isVerifying) {
      if(!authContext?.isVerifying && !token) setLoading(false);
      return;
    }
    if (!authContext.isAuthenticated || !authContext.user || !token) {
      setError("Please login to view your messages.");
      setLoading(false);
      return;
    }

    fetchThreads(token);
  }, [authContext, fetchThreads]);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = async () => {
    const token = localStorage.getItem('atoken');
    if (!token || !authContext?.user) {
      message.error("Authentication error. Please log in again.");
      return;
    }

    try {
      const values = await form.validateFields();
      setIsSubmitting(true);
      
      const payload = {
        subject: values.subject,
        initialMessageContent: values.initialMessageContent,
      };

      await axios.post('/api/v1/messaging/threads', payload, {
        headers: { Authorization: `Basic ${token}` },
      });

      message.success('New message thread created successfully!');
      setIsModalVisible(false);
      form.resetFields();
      fetchThreads(token);
    } catch (err: any) {
      console.error("Error creating new thread:", err);
      const errMsg = err.response?.data?.message || "Failed to create new message thread.";
      message.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authContext) {
    return <Alert message="AuthContext is not available." type="error" showIcon />;
  }
  
  if (authContext.isVerifying) {
     return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin tip="Verifying authentication..." size="large" /></div>;
  }

  const token = localStorage.getItem('atoken');
  if (!authContext.isAuthenticated || !authContext.user || !token) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Alert message="Unauthorized" description={error || "You need to be logged in to view your messages."} type="warning" showIcon />
      </div>
    );
  }
  
  if (loading && !isSubmitting) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}><Spin tip="Loading messages..." size="large" /></div>;
  }

  if (error && threads.length === 0) { 
    return (
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Typography.Title level={2}>My Messages</Typography.Title>
          </div>
          <Typography.Text type="secondary">Conversations with travel operators</Typography.Text>
          <Alert message="Error" description={error} type="error" showIcon style={{ marginTop: 16}} />
        </div>
    );
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>My Messages</Typography.Title>
          <Typography.Text type="secondary">Conversations with travel operators</Typography.Text>
        </div>
        <Button key="1" type="primary" icon={<PlusOutlined />} onClick={showModal}>
          New Message
        </Button>
      </div>

      {error && threads.length > 0 && !isSubmitting && <Alert message="Info" description={error} type="info" showIcon style={{ marginBottom: 16}} />}

      {threads.length === 0 && !loading && !isSubmitting ? (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <MessageOutlined style={{ fontSize: 48, color: '#ccc' }} />
          <Typography.Title level={4} style={{ color: '#aaa', marginTop: 16 }}>No messages yet</Typography.Title>
          <Typography.Text type="secondary">Start a new conversation with travel operators by clicking the "New Message" button.</Typography.Text>
        </div>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={threads}
          renderItem={thread => (
            <List.Item
              key={thread.id}
              actions={[
                <Link to={`/messages/${thread.id}`} state={{ threadDetails: thread }} key={`view-${thread.id}`}>View</Link>,
                <Tooltip title={thread.is_read_by_user ? "No new replies from support" : "New reply from support!"} key={`status-${thread.id}`}>
                  {thread.is_read_by_user 
                    ? <EyeInvisibleOutlined /> 
                    : <EyeOutlined style={{color: 'green'}}/>
                  }
                </Tooltip>
              ]}
            >
              <List.Item.Meta
                title={<Link to={`/messages/${thread.id}`} state={{ threadDetails: thread }}>{thread.subject || `Conversation ID: ${thread.id}`}</Link>}
                description={
                  <>
                    <Typography.Text type="secondary" style={{ display: 'block' }}>
                      {thread.last_message_preview || 'No preview available.'}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: '0.85em' }}>
                      Last update: {new Date(thread.last_message_at).toLocaleString()}
                    </Typography.Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
      <Modal
        title="Start a New Conversation"
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={isSubmitting}
        okText="Send"
        destroyOnClose
      >
        <Form form={form} layout="vertical" name="newMessageForm">
          <Form.Item
            name="subject"
            label="Subject (Optional)"
          >
            <Input placeholder="Enter a subject for your message" />
          </Form.Item>
          <Form.Item
            name="initialMessageContent"
            label="Message"
            rules={[{ required: true, message: 'Please enter your message content!' }]}
          >
            <Input.TextArea rows={4} placeholder="Type your message here..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserMessagesPage; 