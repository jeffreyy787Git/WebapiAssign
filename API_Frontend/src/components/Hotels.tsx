import React, { useContext, useEffect } from 'react';
import { Card, Col, Row, Spin, Button, Typography, message, Alert, Modal, Form, Input, InputNumber } from 'antd';
import axios from 'axios';
import { LoadingOutlined, SyncOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { AuthContext } from './AuthContext';

interface DbHotelImage {
  image_path: string;
}

interface DbHotelRoomRate {
  net: number;
}

interface DbHotelRoom {
  name?: string;
  rates: DbHotelRoomRate[];
}

export interface DisplayableHotel {
  code: number;
  name: string;
  category_name?: string;
  destination_name?: string;
  zone_name?: string;
  currency?: string;
  min_rate?: number;
  max_rate?: number;
  available_rooms?: number;
  images?: { path: string }[];
  rooms?: DbHotelRoom[];
}

interface RefreshResponse {
  message: string;
  refreshedHotelsCount?: number;
}

const { Title } = Typography;

const HotelPage = () => {
  const [dbHotels, setDbHotels] = React.useState<DisplayableHotel[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<'add' | 'edit'>('add');
  const [currentHotel, setCurrentHotel] = React.useState<DisplayableHotel | null>(null);

  const authContext = useContext(AuthContext);
  if (!authContext) {
    return <Alert message="Error" description="AuthContext not found. The application might not be wrapped in AuthProvider." type="error" showIcon />;
  }
  const { user, isAuthenticated, setIsAuthenticated } = authContext;
  const authIsLoading = user === undefined && isAuthenticated === false;

  const dbHotelsApiUri = '/api/v1/db/hotels';
  const refreshDbHotelsApiUri = '/api/v1/db/hotels/refresh';

  const mapRawHotelToDisplayable = (rawHotel: any): DisplayableHotel => {
    return {
      code: rawHotel.code,
      name: rawHotel.name,
      category_name: rawHotel.category_name,
      destination_name: rawHotel.destination_name,
      zone_name: rawHotel.zone_name,
      currency: rawHotel.currency,
      min_rate: rawHotel.min_rate,
      max_rate: rawHotel.max_rate,
      available_rooms: rawHotel.available_rooms,
      images: rawHotel.images?.map((img: any) => ({ path: img.image_path })).slice(0,1) || [],
      rooms: rawHotel.rooms?.map((room: any) => ({
        name: room.name || room.room_name,
        rates: room.rates?.map((rate: any) => ({ net: rate.net })) || []
      })) || []
    };
  };
  
  const fetchHotelsFromDB = async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('atoken');
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setLoading(false);
      setIsAuthenticated(false);
      setDbHotels(null);
      return;
    }

    try {
      const response = await axios.get<any[]>(dbHotelsApiUri, {
        headers: { 'Authorization': `Basic ${token}` }
      });
      console.log('[Hotels.tsx] Raw response from /api/v1/db/hotels:', JSON.stringify(response.data?.slice(0,1), null, 2));
      if (response.data) {
        const mappedHotels = response.data.map(mapRawHotelToDisplayable);
        console.log('[Hotels.tsx] Mapped hotels for display (first hotel):', JSON.stringify(mappedHotels[0], null, 2));
        setDbHotels(mappedHotels);
      } else {
        console.log('[Hotels.tsx] No data received from /api/v1/db/hotels.');
        setDbHotels([]);
      }
    } catch (err: any) {
      if (err && err.isAxiosError && err.response) {
        const errorData = err.response.data;
        const errorMessage = errorData?.error || errorData?.message || err.response.statusText || 'Failed to fetch hotels from DB.';
        setError(errorMessage);
      } else {
        setError(err.message || 'Failed to fetch hotels from DB.');
      }
      setDbHotels(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
        fetchHotelsFromDB();
    } else if (!isAuthenticated && !authIsLoading) {
        setError("You are not authenticated. Please login to view hotels.");
        setLoading(false);
        setDbHotels(null);
    }
  }, [authIsLoading, isAuthenticated]);

  const showAddModal = () => {
    setModalMode('add');
    setCurrentHotel(null);
    setIsModalVisible(true);
  };

  const showEditModal = (hotel: DisplayableHotel) => {
    setModalMode('edit');
    setCurrentHotel(hotel);
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setCurrentHotel(null);
  };

  const [form] = Form.useForm();

  useEffect(() => {
    if (isModalVisible) {
      if (modalMode === 'edit' && currentHotel) {
        form.setFieldsValue({
          ...currentHotel,
          code: currentHotel.code,
          min_rate: currentHotel.min_rate === undefined ? null : Number(currentHotel.min_rate),
          max_rate: currentHotel.max_rate === undefined ? null : Number(currentHotel.max_rate),
          available_rooms: currentHotel.available_rooms === undefined ? 0 : Number(currentHotel.available_rooms),
        });
      } else {
        form.resetFields();
      }
    }
  }, [isModalVisible, modalMode, currentHotel, form]);

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      console.log('Validated Form values:', values);
      const payload = { ...values };

      if (modalMode === 'add') {
        await axios.post(`${dbHotelsApiUri}`, payload, {
          headers: { 'Authorization': `Basic ${localStorage.getItem('atoken')}` }
        });
        message.success('Hotel added successfully!');
      } else if (modalMode === 'edit' && currentHotel) {
        await axios.put(`${dbHotelsApiUri}/${currentHotel.code}`, payload, {
          headers: { 'Authorization': `Basic ${localStorage.getItem('atoken')}` }
        });
        message.success(`Hotel ${currentHotel.code} updated successfully!`);
      }
      setIsModalVisible(false);
      setCurrentHotel(null);
      fetchHotelsFromDB();
    } catch (error: any) {
      console.error('Failed to submit form:', error);
      if (error.response && error.response.data && error.response.data.error) {
        message.error(`Error: ${error.response.data.error}`);
      } else {
        message.error('An error occurred. Please try again.');
      }
    }
  };

  const handleRefreshData = async () => {
    console.log('[Hotels.tsx] User object on refresh click:', JSON.stringify(user, null, 2));
    if (!user || !user.roles || !user.roles.includes('admin')) {
      message.error('You are not authorized to perform this action.');
      return;
    }

    const token = localStorage.getItem('atoken');
    if (!token) {
      message.error('Authentication token not found. Please log in again.');
      setIsAuthenticated(false);
      return;
    }

    setIsRefreshing(true);
    setError(null);
    try {
      message.info('Starting hotel data refresh... This may take a moment.');
      const response = await axios.post<RefreshResponse>(
        refreshDbHotelsApiUri, 
        {},
        { headers: { 'Authorization': `Basic ${token}` } }
      );
      message.success(response.data.message || 'Hotel data refresh initiated successfully!');
      await fetchHotelsFromDB();
    } catch (err: any) {
      let errorMessageText = 'Failed to refresh hotel data.';
      if (err && err.isAxiosError && err.response) {
        const errorData = err.response.data;
        errorMessageText = errorData?.error || errorData?.details || errorData?.message || err.response.statusText || errorMessageText;
         if (err.response.status === 403) {
           errorMessageText = "Forbidden: You do not have permission to refresh data.";
         }
      } else {
        errorMessageText = err.message || errorMessageText;
      }
      setError(errorMessageText);
      message.error(errorMessageText);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteHotel = (hotelCode: number) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this hotel?',
      content: `Hotel with code ${hotelCode} will be permanently deleted.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axios.delete(`${dbHotelsApiUri}/${hotelCode}`, {
            headers: { 'Authorization': `Basic ${localStorage.getItem('atoken')}` }
          });
          message.success(`Hotel ${hotelCode} deleted successfully!`);
          fetchHotelsFromDB();
        } catch (error: any) {
          console.error('Failed to delete hotel:', error);
          if (error.response && error.response.data && error.response.data.error) {
            message.error(`Error: ${error.response.data.error}`);
          } else {
            message.error('An error occurred while deleting the hotel. Please try again.');
          }
        }
      },
    });
  };
  
  if (authIsLoading) {
    const antIcon = <LoadingOutlined style={{ fontSize: 48 }} spin />;
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin indicator={antIcon} tip="Authenticating..." /></div>;
  }

  if (!isAuthenticated && !loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Alert message="Unauthorized" description={error || "You need to be logged in to view this page."} type="error" showIcon />
      </div>
    );
  }

  if (loading) {
    const antIcon = <LoadingOutlined style={{ fontSize: 48 }} spin />;
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin indicator={antIcon} tip="Loading hotels..." /></div>;
  }

  if (error && !dbHotels) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        {user && user.roles === 'admin' && (
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            loading={isRefreshing} 
            onClick={handleRefreshData}
            style={{ marginBottom: 24 }}
            danger
          >
            {isRefreshing ? 'Refreshing Data...' : 'Retry Data Refresh (Admin)'}
          </Button>
        )}
        {user && user.roles === 'admin' && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            style={{marginTop: 8}}
            onClick={showAddModal}
          >
            Add New Hotel
          </Button>
        )}
         {error && dbHotels && (
          <Alert message="Refresh Error" description={error} type="warning" showIcon style={{ marginTop: 16, textAlign: 'left' }} />
        )}
      </div>
    );
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24, padding: '10px' }}>
        <Title level={3}>Hotel Listings</Title>
        {user && user.roles === 'admin' && (
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            loading={isRefreshing} 
            onClick={handleRefreshData}
            style={{marginTop: 8, marginRight: 8}}
          >
            {isRefreshing ? 'Refreshing Hotel Data...' : 'Refresh Hotel Data (Admin)'}
          </Button>
        )}
        {user && user.roles === 'admin' && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            style={{marginTop: 8}}
            onClick={showAddModal}
          >
            Add New Hotel
          </Button>
        )}
         {error && dbHotels && (
          <Alert message="Refresh Error" description={error} type="warning" showIcon style={{ marginTop: 16, textAlign: 'left' }} />
        )}
      </div>
      
      {!dbHotels || dbHotels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Title level={4}>No Hotels Available</Title>
          <p>There are currently no hotels to display. {user && user.roles === 'admin' ? 'Try refreshing the data.' : 'Please check back later.'}</p>
        </div>
      ) : (
        <Row gutter={[16, 16]} style={{padding: '0 24px'}}>
          {dbHotels.map((hotel) => (
            <Col xs={24} sm={12} md={8} lg={6} key={hotel.code}>
              <Card
                title={hotel.name}
                style={{ width: '100%', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
                cover={
                  <img
                    alt={hotel.name}
                    src={hotel.images && hotel.images.length > 0 && hotel.images[0]?.path ? hotel.images[0].path : 'https://via.placeholder.com/300x200.png?text=No+Image'}
                    style={{ height: 200, objectFit: 'cover' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== 'https://via.placeholder.com/300x200.png?text=Image+Error') {
                        target.src = 'https://via.placeholder.com/300x200.png?text=Image+Error';
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                  />
                }
                hoverable
              >
                <p><strong>Category:</strong> {hotel.category_name || 'N/A'}</p>
                <p><strong>Destination:</strong> {hotel.destination_name || 'N/A'} ({hotel.zone_name || 'N/A'})</p>
                {hotel.available_rooms !== undefined && (
                  <p><strong>Available Rooms:</strong> {hotel.available_rooms}</p>
                )}
                {hotel.rooms && hotel.rooms.length > 0 && hotel.rooms[0].rates && hotel.rooms[0].rates.length > 0 && hotel.currency ? (
                  <p><strong>Price (Net):</strong> {hotel.rooms[0].rates[0].net} {hotel.currency}</p>
                ) : hotel.min_rate && hotel.currency ? (
                   <p><strong>Min Price:</strong> {hotel.min_rate} {hotel.currency}</p>
                ) : (
                  <p>Price not available</p>
                )}
                {user && user.roles === 'admin' && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-around' }}>
                    <Button 
                      icon={<EditOutlined />} 
                      onClick={() => showEditModal(hotel)}
                    >
                      Edit
                    </Button>
                    <Button 
                      icon={<DeleteOutlined />} 
                      danger 
                      onClick={() => handleDeleteHotel(hotel.code)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={modalMode === 'add' ? "Add New Hotel" : "Edit Hotel"}
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={modalMode === 'add' ? "Add" : "Save Changes"}
        destroyOnClose
      >
        <Form form={form} layout="vertical" name="hotelForm">
          <Form.Item
            name="code"
            label="Hotel Code"
            rules={[{ required: true, message: 'Please input the hotel code!' }, { type: 'integer', message: 'Code must be an integer'}] }
          >
            <InputNumber style={{ width: '100%' }} disabled={modalMode === 'edit'} />
          </Form.Item>
          <Form.Item
            name="name"
            label="Hotel Name"
            rules={[{ required: true, message: 'Please input the hotel name!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="category_name" label="Category Name">
            <Input />
          </Form.Item>
          <Form.Item name="destination_name" label="Destination Name">
            <Input />
          </Form.Item>
          <Form.Item name="zone_name" label="Zone Name">
            <Input />
          </Form.Item>
          <Form.Item name="currency" label="Currency">
            <Input />
          </Form.Item>
          <Form.Item name="min_rate" label="Min Rate" rules={[{ type: 'number', message: 'Min rate must be a number'}]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="max_rate" label="Max Rate" rules={[{ type: 'number', message: 'Max rate must be a number'}]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="available_rooms" label="Available Rooms" rules={[{ required: true, message: 'Please input available rooms!'}, { type: 'integer', message: 'Available rooms must be an integer'}]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default HotelPage;