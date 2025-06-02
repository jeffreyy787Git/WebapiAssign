import React, { useContext, useEffect, useState, useCallback } from 'react';
import { Card, Col, Row, Spin, Button, Typography, message, Alert, Tooltip } from 'antd';
import axios from 'axios';
import { LoadingOutlined, DeleteOutlined } from '@ant-design/icons';
import { AuthContext, User as AuthUser } from './AuthContext';
import { DisplayableHotel, mapRawHotelToDisplayable } from './Hotels';

interface FavouriteHotelsResponse {
  favouriteHotels: any[];
}

interface RemoveFavouriteResponse {
  message: string;
  user: AuthUser;
}

const { Title } = Typography;

const FavouritesPage = () => {
  const [favouriteHotels, setFavouriteHotels] = useState<DisplayableHotel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authContext = useContext(AuthContext);
  if (!authContext) {
    return <Alert message="Error" description="AuthContext not found." type="error" showIcon />;
  }
  const { user, setUser, isAuthenticated, isVerifying } = authContext;

  const favouritesApiUriBase = '/api/v1/auth/me/favourites/hotels';

  const fetchFavouriteHotels = useCallback(async (token: string) => {
    setLoading(true); setError(null);
    try {
      const response = await axios.get<FavouriteHotelsResponse>(
        favouritesApiUriBase,
        { headers: { 'Authorization': `Basic ${token}` } }
      );
      if (response.data && Array.isArray(response.data.favouriteHotels)) {
        const mappedHotels = response.data.favouriteHotels.map(mapRawHotelToDisplayable);
        setFavouriteHotels(mappedHotels);
      } else {
        setFavouriteHotels([]);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to fetch favourite hotels.';
      setError(errorMessage);
      setFavouriteHotels(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isVerifying) {
      setLoading(true);
      return;
    }
    const token = localStorage.getItem('atoken');
    if (isAuthenticated && token && user) {
      fetchFavouriteHotels(token);
    } else if (!isAuthenticated && !isVerifying) {
      setError("Please log in to see your favourite hotels.");
      setLoading(false);
      setFavouriteHotels(null);
    }
  }, [isVerifying, isAuthenticated, user, fetchFavouriteHotels]);

  const removeFromFavourites = async (hotelCode: number) => {
    const token = localStorage.getItem('atoken');
    if (!token || !user) {
      message.error('You must be logged in to change favourites.');
      return;
    }
    try {
      const response = await axios.delete<RemoveFavouriteResponse>(`${favouritesApiUriBase}/${hotelCode}`, {
        headers: { 'Authorization': `Basic ${token}` }
      });
      message.success('Removed from favourites');
      if (response.data && response.data.user) {
        setUser(response.data.user);
        setFavouriteHotels(prev => prev ? prev.filter(hotel => hotel.code !== hotelCode) : []);
      } else {
        if (token) fetchFavouriteHotels(token);
      }
    } catch (error: any) {
      console.error("Error removing from favourites:", error.response?.data || error.message);
      message.error(error.response?.data?.message || 'Failed to update favourites.');
    }
  };

  if (isVerifying) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="Verifying authentication..." /></div>;
  if (!isAuthenticated && !isVerifying) return <div style={{ padding: 24, textAlign: 'center' }}><Alert message="Unauthorized" description={error || "Please login to view your favourite hotels."} type="error" showIcon /></div>;
  if (loading && !isVerifying) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="Loading favourite hotels..." /></div>;
  if (error && !favouriteHotels && !isVerifying) return <div style={{ padding: 24, textAlign: 'center' }}><Alert message="Error" description={error} type="error" showIcon /></div>;

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24, padding: '10px' }}>
        <Title level={3}>My Favourite Hotels</Title>
      </div>
      
      {(!favouriteHotels || favouriteHotels.length === 0) && !loading && !isVerifying ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Title level={4}>No Favourite Hotels Yet</Title>
          <p>You haven't added any hotels to your favourites. Browse hotels and click the heart icon to add them!</p>
        </div>
      ) : favouriteHotels && favouriteHotels.length > 0 ? (
        <Row gutter={[16, 16]} style={{padding: '0 24px'}}>
          {favouriteHotels.map((hotel) => (
            <Col xs={24} sm={12} md={8} lg={6} key={hotel.code}>
              <Card
                title={hotel.name}
                style={{ width: '100%', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
                cover={
                  <img
                    alt={hotel.name}
                    src={hotel.images && hotel.images.length > 0 && hotel.images[0]?.path ? hotel.images[0].path : 'https://via.placeholder.com/300x200.png?text=No+Image'}
                    style={{ height: 200, objectFit: 'cover' }}
                    onError={(e) => { const target = e.target as HTMLImageElement; if (target.src !== 'https://via.placeholder.com/300x200.png?text=Image+Error') target.src = 'https://via.placeholder.com/300x200.png?text=Image+Error'; }}
                  />
                }
                hoverable
                actions={isAuthenticated ? [
                  <Tooltip title="Remove from Favourites" key={`remove-fav-${hotel.code}`}>
                    <Button 
                      icon={<DeleteOutlined style={{color: 'red'}} />}
                      onClick={() => removeFromFavourites(hotel.code)}
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
          ))}
        </Row>
      ) : null}
    </>
  );
}

export default FavouritesPage; 