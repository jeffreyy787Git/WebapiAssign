import React from 'react';
import { Card, Col, Row, Spin, Input, Button, Form, Typography } from 'antd';
import axios from 'axios';
import {LoadingOutlined} from '@ant-design/icons';

interface Hotel {
  code: number;
  name: string;
  categoryName: string;
  destinationName: string;
  zoneName: string;
  currency: string;
  minRate: number;
  maxRate: number;
  images?: { path: string }[];
}

interface Rate {
  rateKey: string;
  rateClass: string;
  rateType: string;
  net: number;
  sellingRate: number;
  hotelMandatory: boolean;
  adults: number;
  children: number;
  rooms: number;
  boardName: string;
}

interface Room {
  code: string;
  name: string;
  rates: Rate[];
}

interface HotelData {
  code: number;
  name: string;
  categoryName: string;
  destinationName: string;
  zoneName: string;
  currency: string;
  minRate: number;
  maxRate: number;
  rooms: Room[];
  images?: { path: string }[];
}

interface HotelbedsHotel {
    code: number;
    name: string;
    categoryName: string;
    destinationName: string;
    zoneName: string;
    currency: string;
    minRate: number;
    maxRate: number;
    rooms: Room[];
}

interface HotelContentImage {
  path: string;
  order: number;
  visualOrder: number;
  type: {
    code: string;
    description: string;
  };
}

interface HotelbedsHotelContent {
  code: number;
  images?: HotelContentImage[];
  content?: {
    images?: HotelContentImage[];
  };
}

interface HotelContentProxyResponse {
  hotels: HotelbedsHotelContent[];
}

interface HotelbedsHotelsResponse {
    hotels: HotelbedsHotel[];
}

interface ProxySuccessResponse {
    hotels: HotelbedsHotelsResponse;
}

interface ProxyErrorResponse {
    error: {
        message?: string;
    } | string;
}

type ProxyResponseData = ProxySuccessResponse | ProxyErrorResponse;

const { Title } = Typography;

const HotelPage = () => {
  const [hotels, setHotels] = React.useState<HotelData[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentDestination, setCurrentDestination] = React.useState<string>("NYC");

  const backendProxyApiUri = '/api/v1/proxy/hotels';

  const fetchHotelsByDestination = async (destinationCode: string) => {
    setLoading(true);
    setError(null);
    setHotels(null);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const checkInDate = tomorrow.toISOString().split('T')[0];

      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      const checkOutDate = dayAfterTomorrow.toISOString().split('T')[0];

      const requestBody = {
        stay: {
          checkIn: checkInDate,
          checkOut: checkOutDate,
        },
        occupancies: [
          {
            rooms: 1,
            adults: 2,
            children: 0,
          },
        ],
        destination: {
          code: destinationCode
        },
        settings: {
          fields: ["name", "code", "categoryName", "destinationName", "zoneName", "currency", "minRate", "maxRate", "rooms"]
        }
      };

      const response = await axios.post<ProxyResponseData>(
        backendProxyApiUri,
        requestBody,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      const responseData = response.data;

      if ('hotels' in responseData && responseData.hotels && responseData.hotels.hotels) {
        const bookingApiHotels: HotelbedsHotel[] = responseData.hotels.hotels;

        if (bookingApiHotels.length === 0) {
          setHotels([]);
        } else {
          const hotelsForContentAPILookup = bookingApiHotels.slice(0, 200);
          const hotelCodesStringForContent = hotelsForContentAPILookup.map(h => h.code).join(',');

          try {
            let hotelContentsData: HotelContentProxyResponse | null = null;

            if (hotelCodesStringForContent) {
              const contentResponse = await axios.get<HotelContentProxyResponse>(
                `/api/v1/proxy/hotel-content?hotelCodes=${hotelCodesStringForContent}`
              );
              hotelContentsData = contentResponse.data;
            }

            const contentMap = new Map<number, HotelbedsHotelContent>();
            if (hotelContentsData && hotelContentsData.hotels) {
              hotelContentsData.hotels.forEach(contentHotel => {
                contentMap.set(contentHotel.code, contentHotel);
              });
            }
            
            const fetchedHotelsWithContent: HotelData[] = bookingApiHotels.map((hotel: HotelbedsHotel) => {
              const content = contentMap.get(hotel.code);
              let finalImageArray: { path: string }[] | undefined = undefined;

              const imagesFromContent = content?.images || content?.content?.images;

              if (imagesFromContent && imagesFromContent.length > 0) {
                const mainImage = imagesFromContent.sort((a, b) => a.visualOrder - b.visualOrder || a.order - b.order)[0];
                if (mainImage && mainImage.path) {
                  const imageUrl = `http://photos.hotelbeds.com/giata/${mainImage.path}`;
                  finalImageArray = [{ path: imageUrl }];
                }
              }

              return {
                code: hotel.code,
                name: hotel.name,
                categoryName: hotel.categoryName,
                destinationName: hotel.destinationName,
                zoneName: hotel.zoneName,
                currency: hotel.currency,
                minRate: hotel.minRate,
                maxRate: hotel.maxRate,
                rooms: hotel.rooms || [],
                images: finalImageArray,
              };
            });
            setHotels(fetchedHotelsWithContent);

          } catch (contentErr: any) {
            setError("Failed to fetch some hotel details (e.g., images), but basic info is available.");
            const fallbackHotels: HotelData[] = bookingApiHotels.map(hotel => ({
              code: hotel.code,
              name: hotel.name,
              categoryName: hotel.categoryName,
              destinationName: hotel.destinationName,
              zoneName: hotel.zoneName,
              currency: hotel.currency,
              minRate: hotel.minRate,
              maxRate: hotel.maxRate,
              rooms: hotel.rooms || [],
              images: undefined,
            }));
            setHotels(fallbackHotels);
          }
        }
      } else if ('error' in responseData && responseData.error) {
          const errorMessage = typeof responseData.error === 'string' ? responseData.error : responseData.error.message;
          setError(errorMessage || 'Unknown error from proxy while fetching hotel list.');
          setHotels(null);
      } else {
          setHotels([]);
          setError('Unexpected response structure from proxy while fetching hotel list.');
      }

    } catch (err: any) {
      if (err && err.isAxiosError && err.response) {
          const errorData = err.response.data as ProxyErrorResponse | undefined;
          const errorMessage = errorData?.error ? (typeof errorData.error === 'string' ? errorData.error : errorData.error.message) : undefined;
          setError(errorMessage || err.response.statusText || 'Failed to fetch hotels via proxy.');
      } else {
          setError(err.message || 'Failed to fetch hotels via proxy.');
      }
      setHotels(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(()=>{
    fetchHotelsByDestination(currentDestination);
  }, [currentDestination]);

  const handleSearch = (values: { destination: string }) => {
    if (values.destination && values.destination.trim() !== "") {
      setCurrentDestination(values.destination.trim().toUpperCase());
    }
  };

  if (loading) {
    const antIcon = <LoadingOutlined style={{ fontSize: 48}} spin />
    return(<Spin indicator={antIcon} />);
  }

  if (error) {
    return (<div style={{color: 'red'}}>Error: {error}</div>);
  }

  if (!hotels || hotels.length === 0) {
    return(
      <>
        <Form
          layout="inline"
          onFinish={handleSearch}
          initialValues={{ destination: currentDestination }}
          style={{ marginBottom: 24, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <Form.Item name="destination" rules={[{ required: true, message: 'Please input destination code!' }]}>
            <Input placeholder="Enter Destination Code (e.g., PAR, LON)" style={{width: 250}} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Search Hotels
            </Button>
          </Form.Item>
        </Form>
        <div>There are no hotels available for the selected criteria for {currentDestination}.</div>
      </>
    )
  }

  return (
    <>
      <Form
        layout="inline"
        onFinish={handleSearch}
        initialValues={{ destination: currentDestination }}
        style={{ marginBottom: 24, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <Form.Item name="destination" rules={[{ required: true, message: 'Please input destination code!' }]}>
          <Input placeholder="Enter Destination Code (e.g., PAR, LON)" style={{width: 250}} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Search Hotels
          </Button>
        </Form.Item>
      </Form>

      <Title level={4} style={{ textAlign: 'center', marginBottom: 16 }}>Showing hotels for: {currentDestination}</Title>

      <Row gutter={[16, 16]}>
        {hotels.map((hotel) => (
          <Col xs={24} sm={12} md={8} lg={6} key={hotel.code}>
            <Card
              title={hotel.name}
              style={{ width: '100%' }}
              cover={
                <img
                  alt={hotel.name}
                  src={hotel.images && hotel.images.length > 0 && hotel.images[0]?.path ? hotel.images[0].path : undefined}
                  style={{ height: 200, objectFit: 'cover' }}
                  onError={(e) => { 
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none'; 
                  }}
                />
              }
              hoverable
            >
              <p><strong>Category:</strong> {hotel.categoryName}</p>
              <p><strong>Destination:</strong> {hotel.destinationName} ({hotel.zoneName})</p>
              {hotel.rooms && hotel.rooms.length > 0 && hotel.rooms[0].rates && hotel.rooms[0].rates.length > 0 && (
                <p><strong>Price (Net):</strong> {hotel.rooms[0].rates[0].net} {hotel.currency}</p>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}

export default HotelPage;