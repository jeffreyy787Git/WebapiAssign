import React, { useContext, useEffect, useState, useCallback } from 'react';
import { Card, Col, Row, Spin, Button, Typography, message, Alert, Modal, Form, Input, InputNumber, Tooltip } from 'antd';
import axios from 'axios';
import { LoadingOutlined, SyncOutlined, PlusOutlined, EditOutlined, DeleteOutlined, HeartOutlined, HeartFilled } from '@ant-design/icons';
import { AuthContext, User as AuthUser } from './AuthContext';

export interface DbHotelImage {
  image_path: string;
}

export interface DbHotelRoomRate {
  net: number;
}

export interface DbHotelRoom {
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

interface FavouriteChangeResponse {
  message: string;
  user: AuthUser;
}

const { Title } = Typography;

export const mapRawHotelToDisplayable = (rawHotel: any): DisplayableHotel => {
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
    images: Array.isArray(rawHotel.images) ? rawHotel.images.map((img: any) => ({ path: img.image_path })).slice(0,1) : [],
    rooms: Array.isArray(rawHotel.rooms) ? rawHotel.rooms.map((room: any) => ({
      name: room.name || room.room_name,
      rates: Array.isArray(room.rates) ? room.rates.map((rate: any) => ({ net: rate.net })) : []
    })) : []
  };
};

const HotelPage = () => {
  const [dbHotels, setDbHotels] = useState<DisplayableHotel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentHotel, setCurrentHotel] = useState<DisplayableHotel | null>(null);
  const [form] = Form.useForm();

  const authContext = useContext(AuthContext);
  if (!authContext) {
    return <Alert message="Error" description="AuthContext not found." type="error" showIcon />;
  }
  const { user, setUser, isAuthenticated, setIsAuthenticated, isVerifying } = authContext;

  const favouritesApiUriBase = '/api/v1/auth/me/favourites/hotels';
  const dbHotelsApiUri = '/api/v1/db/hotels';
  const refreshDbHotelsApiUri = '/api/v1/db/hotels/refresh';

  const toggleFavourite = useCallback(async (hotelCode: number, isCurrentlyFavourite: boolean, currentUser: AuthUser | null, setCurrentUserFunction: (u: AuthUser | null) => void) => {
    const token = localStorage.getItem('atoken');
    if (!token || !currentUser) { message.error('You must be logged in to change favourites.'); return; }
    try {
      if (isCurrentlyFavourite) {
        const response = await axios.delete<FavouriteChangeResponse>(`${favouritesApiUriBase}/${hotelCode}`, { headers: { 'Authorization': `Basic ${token}` } });
        message.success('Removed from favourites');
        if (response.data && response.data.user) setCurrentUserFunction(response.data.user);
        else console.warn("User object not found in favourite toggle (delete) response.");
      } else {
        const response = await axios.post<FavouriteChangeResponse>(favouritesApiUriBase, { hotelCode }, { headers: { 'Authorization': `Basic ${token}` } });
        message.success('Added to favourites');
        if (response.data && response.data.user) setCurrentUserFunction(response.data.user);
        else console.warn("User object not found in favourite toggle (post) response.");
      }
    } catch (err: any) { 
      message.error(err.response?.data?.message || 'Failed to update favourites.'); 
      console.error("Error toggling favourite:", err.response?.data || err.message);
    }
  }, []);

  const isFavourite = useCallback((hotelCode: number, currentUser: AuthUser | null): boolean => {
    return !!currentUser && !!currentUser.favourite_hotels && currentUser.favourite_hotels.includes(hotelCode);
  }, []);

  const fetchHotelsFromDB = useCallback(async (token: string) => {
    setLoading(true); setError(null);
    try {
      const response = await axios.get<DisplayableHotel[]>(dbHotelsApiUri, { headers: { 'Authorization': `Basic ${token}` } });
      const rawHotels = await axios.get<any[]>(dbHotelsApiUri, { headers: { 'Authorization': `Basic ${token}` } });
      if (rawHotels.data) setDbHotels(rawHotels.data.map(mapRawHotelToDisplayable));
      else setDbHotels([]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to fetch hotels.';
      setError(errorMessage); setDbHotels(null);
      if (err.response?.status === 401) setIsAuthenticated(false);
    } finally { setLoading(false); }
  }, [setIsAuthenticated]);

  useEffect(() => {
    if (isVerifying) {
      setLoading(true);
      return;
    }
    const token = localStorage.getItem('atoken');
    if (isAuthenticated && token) {
      fetchHotelsFromDB(token);
    } else if (!isAuthenticated) {
      setError("You are not authenticated. Please login to view hotels.");
      setLoading(false);
      setDbHotels(null);
    }
  }, [isVerifying, isAuthenticated, fetchHotelsFromDB]);

  const showAddModal = () => { setModalMode('add'); setCurrentHotel(null); setIsModalVisible(true); };
  const showEditModal = (hotel: DisplayableHotel) => { setModalMode('edit'); setCurrentHotel(hotel); setIsModalVisible(true); };
  const handleModalCancel = () => { setIsModalVisible(false); setCurrentHotel(null); };

  useEffect(() => {
    if (isModalVisible) {
      if (modalMode === 'edit' && currentHotel) {
        form.setFieldsValue({ ...currentHotel, code: currentHotel.code,
          min_rate: currentHotel.min_rate === undefined ? null : Number(currentHotel.min_rate),
          max_rate: currentHotel.max_rate === undefined ? null : Number(currentHotel.max_rate),
          available_rooms: currentHotel.available_rooms === undefined ? 0 : Number(currentHotel.available_rooms),
        });
      } else form.resetFields();
    }
  }, [isModalVisible, modalMode, currentHotel, form]);

  const handleModalOk = async () => {
    const token = localStorage.getItem('atoken'); 
    if (!token) { message.error("Not authenticated. Please login again."); return; }
    try {
      const values = await form.validateFields(); const payload = { ...values };
      if (modalMode === 'add') {
        await axios.post<DisplayableHotel>(`${dbHotelsApiUri}`, payload, { headers: { 'Authorization': `Basic ${token}` } });
        message.success('Hotel added successfully!');
      } else if (modalMode === 'edit' && currentHotel) {
        await axios.put<DisplayableHotel>(`${dbHotelsApiUri}/${currentHotel.code}`, payload, { headers: { 'Authorization': `Basic ${token}` } });
        message.success(`Hotel ${currentHotel.code} updated successfully!`);
      }
      setIsModalVisible(false); setCurrentHotel(null); 
      if (token) fetchHotelsFromDB(token);
    } catch (error: any) { 
      message.error(error.response?.data?.error || 'Failed to submit form.'); 
      console.error("Error in Modal OK:", error.response?.data || error.message);
    }
  };

  const handleRefreshData = async () => {
    if (!user || !user.roles || !user.roles.includes('admin')) { message.error('Unauthorized.'); return; }
    const token = localStorage.getItem('atoken'); 
    if (!token) { message.error("Not authenticated. Please login again."); setIsAuthenticated(false); return; }
    setIsRefreshing(true); setError(null);
    try {
      message.info('Starting hotel data refresh...');
      const response = await axios.post<RefreshResponse>(refreshDbHotelsApiUri, {}, { headers: { 'Authorization': `Basic ${token}` } });
      message.success(response.data.message || 'Hotel data refresh initiated!');
      if (token) await fetchHotelsFromDB(token);
    } catch (err: any) {
      const errorMessageText = err.response?.data?.error || err.response?.data?.details || 'Failed to refresh hotel data.';
      setError(errorMessageText); message.error(errorMessageText);
      console.error("Error refreshing data:", err.response?.data || err.message);
    } finally { setIsRefreshing(false); }
  };

  const handleDeleteHotel = (hotelCode: number) => {
    const token = localStorage.getItem('atoken'); 
    if (!token) { message.error("Not authenticated. Please login again."); return; }
    Modal.confirm({
      title: 'Delete this hotel?', content: `Hotel ${hotelCode} will be deleted.`,
      okText: 'Delete', okType: 'danger',
      onOk: async () => {
        try {
          await axios.delete(`${dbHotelsApiUri}/${hotelCode}`, { headers: { 'Authorization': `Basic ${token}` } });
          message.success(`Hotel ${hotelCode} deleted.`); 
          if (token) fetchHotelsFromDB(token);
        } catch (error: any) { 
          message.error(error.response?.data?.error || 'Failed to delete hotel.'); 
          console.error("Error deleting hotel:", error.response?.data || error.message);
        }
      },
    });
  };

  if (isVerifying) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="Verifying authentication..." /></div>;

  if (!isAuthenticated && !loading && !isVerifying) return <div style={{ padding: 24, textAlign: 'center' }}><Alert message="Unauthorized" description={error || "Please login to view hotels."} type="error" showIcon /></div>;

  if (loading && !isVerifying) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="Loading hotels..." /></div>;

  if (error && !dbHotels && !isVerifying) {
     return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Alert message="Error" description={error} type="error" showIcon />
        {user && user.roles && user.roles.includes('admin') &&
          <Button type="primary" icon={<SyncOutlined />} loading={isRefreshing} onClick={handleRefreshData} style={{ marginTop: 24 }} danger>
            {isRefreshing ? 'Refreshing Data...' : 'Retry Data Refresh (Admin)'}
          </Button>}
      </div>
    );
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24, padding: '10px' }}>
        <Title level={3}>Hotel Listings</Title>
        {user && user.roles && user.roles.includes('admin') && (
          <>
            <Button type="primary" icon={<SyncOutlined />} loading={isRefreshing} onClick={handleRefreshData} style={{marginTop: 8, marginRight: 8}}>
              {isRefreshing ? 'Refreshing Hotel Data...' : 'Refresh Hotel Data (Admin)'}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} style={{marginTop: 8}} onClick={showAddModal}>
              Add New Hotel
            </Button>
          </>
        )}
         {error && dbHotels && <Alert message="Last Operation Error" description={error} type="warning" showIcon style={{ marginTop: 16, textAlign: 'left' }} />}
      </div>

      {!dbHotels || dbHotels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
        { !isAuthenticated && !isVerifying && error ? null : <Title level={4}>No Hotels Available</Title> }
          <p>There are currently no hotels to display. {user && user.roles && user.roles.includes('admin') ? 'Try refreshing the data.' : isAuthenticated ? '' : 'Please check back later.'}</p>
        </div>
      ) : (
        <Row gutter={[16, 16]} style={{padding: '0 24px'}}>
          {dbHotels.map((hotel) => {
            const currentlyFavourite = isFavourite(hotel.code, user);
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={hotel.code}>
                <Card
                  title={hotel.name}
                  style={{ width: '100%', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
                  cover={ <img alt={hotel.name} src={hotel.images && hotel.images.length > 0 && hotel.images[0]?.path ? hotel.images[0].path : 'https://via.placeholder.com/300x200.png?text=No+Image'} style={{ height: 200, objectFit: 'cover' }} onError={(e) => { const target = e.target as HTMLImageElement; if (target.src !== 'https://via.placeholder.com/300x200.png?text=Image+Error') target.src = 'https://via.placeholder.com/300x200.png?text=Image+Error'; }} /> }
                  hoverable
                  actions={isAuthenticated ? [
                    ...(user && user.roles && user.roles.includes('admin') ? [
                      <Tooltip title="Edit Hotel" key={`edit-${hotel.code}`}><Button icon={<EditOutlined />} onClick={() => showEditModal(hotel)} type="text" /></Tooltip>,
                      <Tooltip title="Delete Hotel" key={`delete-${hotel.code}`}><Button icon={<DeleteOutlined />} danger onClick={() => handleDeleteHotel(hotel.code)} type="text" /></Tooltip>
                    ] : []),
                    <Tooltip title={currentlyFavourite ? "Remove from Favourites" : "Add to Favourites"} key={`fav-${hotel.code}`}>
                      <Button
                        icon={currentlyFavourite ? <HeartFilled style={{color: 'red'}} /> : <HeartOutlined />}
                        onClick={() => toggleFavourite(hotel.code, currentlyFavourite, user, setUser)}
                        type="text"
                      />
                    </Tooltip>
                  ] : []}
                >
                  <p><strong>Category:</strong> {hotel.category_name || 'N/A'}</p>
                  <p><strong>Destination:</strong> {hotel.destination_name || 'N/A'} ({hotel.zone_name || 'N/A'})</p>
                  {hotel.available_rooms !== undefined && <p><strong>Available Rooms:</strong> {hotel.available_rooms}</p>}
                  {hotel.rooms && hotel.rooms.length > 0 && hotel.rooms[0].rates && hotel.rooms[0].rates.length > 0 && hotel.currency ? (
                    <p><strong>Price (Net):</strong> {hotel.rooms[0].rates[0].net} {hotel.currency}</p>
                  ) : hotel.min_rate && hotel.currency ? (
                     <p><strong>Min Price:</strong> {hotel.min_rate} {hotel.currency}</p>
                  ) : <p>Price not available</p>}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
      <Modal title={modalMode === 'add' ? "Add New Hotel" : "Edit Hotel"} open={isModalVisible} onOk={handleModalOk} onCancel={handleModalCancel} okText={modalMode === 'add' ? "Add" : "Save Changes"} destroyOnClose>
        <Form form={form} layout="vertical" name="hotelForm">
          <Form.Item name="code" label="Hotel Code" rules={[{ required: true, message: 'Please input the hotel code!' }, { type: 'integer', message: 'Code must be an integer'}] } ><InputNumber style={{ width: '100%' }} disabled={modalMode === 'edit'} /></Form.Item>
          <Form.Item name="name" label="Hotel Name" rules={[{ required: true, message: 'Please input the hotel name!' }]} ><Input /></Form.Item>
          <Form.Item name="category_name" label="Category Name"><Input /></Form.Item>
          <Form.Item name="destination_name" label="Destination Name"><Input /></Form.Item>
          <Form.Item name="zone_name" label="Zone Name"><Input /></Form.Item>
          <Form.Item name="currency" label="Currency"><Input /></Form.Item>
          <Form.Item name="min_rate" label="Min Rate" rules={[{ type: 'number', message: 'Min rate must be a number'}]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="max_rate" label="Max Rate" rules={[{ type: 'number', message: 'Max rate must be a number'}]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="available_rooms" label="Available Rooms" rules={[{ required: true, message: 'Please input available rooms!'}, { type: 'integer', message: 'Available rooms must be an integer'}]}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default HotelPage;