import React, { useState, useContext, ChangeEvent } from 'react';
import { message, Button, Avatar, Typography, Spin } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { AuthContext, User } from './AuthContext';
import axios from 'axios';
import { api } from './common/http-common';

const { Title } = Typography;

interface AvatarUpdateResponse {
  message: string;
  user: User; 
}

const Profile: React.FC = () => {
  const authContext = useContext(AuthContext);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);

  if (!authContext) {
    return <p>Auth context not available. Please ensure you are logged in and AuthProvider is set up.</p>;
  }
  const { user, setUser, isAuthenticated } = authContext;

  React.useEffect(() => {
    if (user && user.avatarurl) {
      if (user.avatarurl.startsWith('/')) {
        const backendBaseUrl = api.uri.endsWith('/') ? api.uri.slice(0, -1) : api.uri;
        setPreviewAvatarUrl(backendBaseUrl + user.avatarurl);
      } else {
        setPreviewAvatarUrl(user.avatarurl);
      }
    } else {
      setPreviewAvatarUrl(null);
    }
  }, [user]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    } else {
      setFile(null);
      if (user && user.avatarurl) {
        if (user.avatarurl.startsWith('/')) {
            const backendBaseUrl = api.uri.endsWith('/') ? api.uri.slice(0, -1) : api.uri;
            setPreviewAvatarUrl(backendBaseUrl + user.avatarurl);
        } else {
            setPreviewAvatarUrl(user.avatarurl);
        }
      } else {
        setPreviewAvatarUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      message.error('Please select a file first!');
      return;
    }
    if (!user || !user.id) {
      message.error('User not found. Cannot upload image.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);

    try {
      const token = localStorage.getItem('atoken');
      if (!token) {
        message.error('Authentication token not found. Please log in again.');
        setUploading(false);
        return;
      }

      const response = await axios.put<AvatarUpdateResponse>(
        `${api.uri}/auth/me/avatar`,
        formData,
        {
          headers: {
            'Authorization': `Basic ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data && response.data.user) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        if (updatedUser.avatarurl) {
            if (updatedUser.avatarurl.startsWith('/')) {
                const backendBaseUrl = api.uri.endsWith('/') ? api.uri.slice(0, -1) : api.uri;
                setPreviewAvatarUrl(backendBaseUrl + updatedUser.avatarurl);
            } else {
                setPreviewAvatarUrl(updatedUser.avatarurl);
            }
        } else {
            setPreviewAvatarUrl(null);
        }
        message.success('Avatar updated successfully!');
      } else {
        message.error('Failed to update avatar. Backend response was not in the expected format.');
      }
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      message.error('Failed to update avatar: ' + (error.response?.data?.message || error.message));
      if (user && user.avatarurl) {
        if (user.avatarurl.startsWith('/')) {
            const backendBaseUrl = api.uri.endsWith('/') ? api.uri.slice(0, -1) : api.uri;
            setPreviewAvatarUrl(backendBaseUrl + user.avatarurl);
        } else {
            setPreviewAvatarUrl(user.avatarurl);
        }
      } else {
        setPreviewAvatarUrl(null);
      }
    }
    setUploading(false);
    setFile(null);
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
        (fileInput as HTMLInputElement).value = "";
    }
  };

  if (!isAuthenticated || !user) {
    return <p>Please log in to view your profile.</p>;
  }
  
  React.useEffect(() => {
    if (!isAuthenticated) {
      localStorage.clear();
    }
  }, [isAuthenticated]);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <Title level={2}>User Profile</Title>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <Avatar 
          size={128} 
          src={previewAvatarUrl}
          icon={!previewAvatarUrl ? <UserOutlined /> : null} 
        />
      </div>
      <Title level={4}>Update Profile Picture</Title>
      <input type="file" onChange={handleFileChange} accept="image/png, image/jpeg" style={{ marginBottom: '10px' }} />
      <Button 
        onClick={handleUpload} 
        disabled={!file || uploading} 
        loading={uploading}
        icon={<UploadOutlined />}
        type="primary"
      >
        {uploading ? 'Uploading...' : 'Upload Image'}
      </Button>
      {uploading && <Spin style={{ marginLeft: '10px'}}/>}
      
      <div style={{ marginTop: '30px' }}>
        <Title level={4}>Details</Title>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
      </div>
    </div>
  );
}

export default Profile; 