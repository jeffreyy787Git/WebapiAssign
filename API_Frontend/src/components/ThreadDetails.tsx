import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { List, Typography, Spin, Alert, Button, Input, Form, message, Card, Avatar, Tooltip } from 'antd';
import axios from 'axios';
import { AuthContext, User as AuthUser } from './AuthContext';
import { ArrowLeftOutlined, SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import moment from 'moment';
import { api } from './common/http-common';

export interface DisplayableThreadMessage {
  id: number;
  thread_id: number;
  sender_id: number;
  sender_username: string; 
  sender_avatarurl?: string | null;
  content: string;
  created_at: string; 
}

export interface ThreadDetails {
    id: number;
    subject?: string | null;
    user_id: number;
    user_username?: string;
    status: string;
}

interface ReplyFormValues {
  replyContent: string;
}

const ThreadDetailsPage: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const authContext = useContext(AuthContext);

  const initialThreadDetails = location.state?.threadDetails as ThreadDetails | null;
  const [messages, setMessages] = useState<DisplayableThreadMessage[]>([]);
  const [threadDetails, setThreadDetails] = useState<ThreadDetails | null>(initialThreadDetails);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);
  const [replyForm] = Form.useForm<ReplyFormValues>();

  const currentUserId = authContext?.user?.id;
  const currentUserIsAdmin = authContext?.user?.roles?.includes('admin') || false;

  const fetchMessages = useCallback(async (token: string, currentThreadId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<DisplayableThreadMessage[]>(
        `/api/v1/messaging/threads/${currentThreadId}/messages`,
        { headers: { Authorization: `Basic ${token}` } }
      );
      setMessages(response.data);

      if (response.data.length > 0) {
        try {
            await axios.post(`/api/v1/messaging/threads/${currentThreadId}/read`, {}, {
                headers: { Authorization: `Basic ${token}` }
            });
        } catch (readError) {
            console.error("Error marking thread as read:", readError);
        }
      }

    } catch (err: any) {
      console.error("Error fetching messages:", err);
      const errMsg = err.response?.data?.message || "Failed to fetch messages for this thread.";
      setError(errMsg);
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('atoken');
    if (!authContext || authContext.isVerifying) {
      return;
    }
    if (!authContext.isAuthenticated || !authContext.user || !token || !threadId) {
      setError("Invalid request or not authenticated.");
      setLoading(false);
      if (!threadId) navigate('/messages');
      return;
    }

    const fetchData = async () => {
      await fetchMessages(token, threadId);

      if (!initialThreadDetails && threadId && token) {
        try {
          const response = await axios.get<ThreadDetails>(
            `/api/v1/messaging/threads/${threadId}`,
            { headers: { Authorization: `Basic ${token}` } }
          );
          setThreadDetails(response.data);
        } catch (err: any) {
          console.error("Error fetching thread details separately:", err);
        }
      }
    };

    fetchData();

  }, [authContext, threadId, fetchMessages, navigate, initialThreadDetails]);

  const handleSendReply = async () => {
    const token = localStorage.getItem('atoken');
    if (!token || !currentUserId || !threadId) {
      message.error("Cannot send reply. Authentication or request error.");
      return;
    }

    try {
      const values = await replyForm.validateFields();
      if (!values.replyContent.trim()) {
        message.warning("Reply cannot be empty.");
        return;
      }
      setIsSendingReply(true);

      const payload = { content: values.replyContent };
      await axios.post<DisplayableThreadMessage>(
        `/api/v1/messaging/threads/${threadId}/messages`,
        payload,
        { headers: { Authorization: `Basic ${token}` } }
      );
      
      replyForm.resetFields();
      fetchMessages(token, threadId);
      message.success("Reply sent!");

    } catch (err: any) {
      console.error("Error sending reply:", err);
      const errMsg = err.response?.data?.message || "Failed to send reply.";
      message.error(errMsg);
    } finally {
      setIsSendingReply(false);
    }
  };

  if (!authContext) {
    return <Alert message="AuthContext is not available." type="error" showIcon />;
  }

  if (authContext.isVerifying) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin tip="Verifying authentication..." size="large" /></div>;
  }

  const authToken = localStorage.getItem('atoken');
  if (!authContext.isAuthenticated || !authContext.user || !authToken) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Alert message="Unauthorized" description="You need to be logged in to view messages." type="warning" showIcon />
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}><Spin tip="Loading messages..." size="large" /></div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>Back to Messages</Button>
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        Back to All Messages
      </Button>
      {threadDetails?.subject && (
        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
          {threadDetails.subject}
        </Typography.Title>
      )}

      <List
        itemLayout="horizontal"
        dataSource={messages}
        renderItem={msg => {
          const isCurrentUserSender = msg.sender_id === currentUserId;
          const isSenderAdminForDisplay = msg.sender_username?.toLowerCase().includes('admin') || (currentUserIsAdmin && isCurrentUserSender);

          let avatarSrc: string | undefined = undefined;
          if (msg.sender_avatarurl) {
            if (msg.sender_avatarurl.startsWith('/')) {
              const backendBaseUrl = api.uri.endsWith('/') ? api.uri.slice(0, -1) : api.uri;
              avatarSrc = backendBaseUrl + msg.sender_avatarurl;
            } else {
              avatarSrc = msg.sender_avatarurl;
            }
          }

          return (
            <List.Item 
              key={msg.id}
              style={{
                textAlign: isCurrentUserSender ? 'right' : 'left',
                paddingLeft: isCurrentUserSender ? '40px' : '0px',
                paddingRight: isCurrentUserSender ? '0px' : '40px',
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar 
                    src={avatarSrc} 
                    icon={!avatarSrc ? (isSenderAdminForDisplay ? <RobotOutlined /> : <UserOutlined />) : null}
                  />
                } 
                title={`${msg.sender_username} ${isCurrentUserSender ? '(You)' : ''}`}
                description={
                    <Card 
                        bodyStyle={{ padding: '10px 15px'}}
                        style={{ 
                            display: 'inline-block', 
                            maxWidth: '70%', 
                            backgroundColor: isCurrentUserSender ? '#e6f7ff' : '#f0f0f0',
                            borderRadius: '10px',
                            textAlign: 'left'
                        }}
                    >
                        <Typography.Text>{msg.content}</Typography.Text>
                        <div style={{ fontSize: '0.75em', color: 'gray', marginTop: '5px' }}>
                            {moment(msg.created_at).format('YYYY-MM-DD HH:mm:ss')}
                        </div>
                    </Card>
                }
              />
            </List.Item>
          );
        }}
      />
      {messages.length === 0 && !loading && <p>No messages in this conversation yet.</p>}

      <Form form={replyForm} onFinish={handleSendReply} layout="inline" style={{ marginTop: '20px' }}>
        <Form.Item name="replyContent" style={{ flexGrow: 1 }} rules={[{ required: true, message: 'Cannot send an empty message'}]}>
          <Input.TextArea rows={2} placeholder="Type your reply..." />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={isSendingReply}>
            Send
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ThreadDetailsPage; 