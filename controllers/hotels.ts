import Koa from 'koa';
import * as hotelModel from '../models/hotels.model';
import axios from 'axios';
import crypto from 'crypto-js';

interface HotelbedsHotel {
    code: number;
    name: string;
    categoryName: string;
    destinationName: string;
    zoneName: string;
    currency: string;
    minRate?: number;
    maxRate?: number;
    rooms?: HotelbedsRoom[];
}

interface HotelbedsRoom {
    code: string;
    name: string;
    rates: HotelbedsRate[];
}

interface HotelbedsRate {
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

interface HotelbedsHotelsResponseData {
    hotels: HotelbedsHotel[];
    from?: number;
    to?: number;
    total?: number;
}


interface HotelbedsHotelsResponse {
    hotels: HotelbedsHotelsResponseData;
}

interface HotelContentImage {
  path: string;
  order: number;
  visualOrder: number;
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

const HOTELBEDS_API_KEY = process.env.HOTELBEDS_API_KEY || '9fd9017beb50107aab2b981cbef50a9d';
const HOTELBEDS_API_SECRET = process.env.HOTELBEDS_API_SECRET || '5d70d1df46';
const HOTELBEDS_API_URI = process.env.HOTELBEDS_API_URI || 'https://api.test.hotelbeds.com/hotel-api/1.0';
const HOTELBEDS_CONTENT_API_URI = process.env.HOTELBEDS_CONTENT_API_URI || 'https://api.test.hotelbeds.com/hotel-content-api/1.0';

export const isAdmin = async (ctx: Koa.Context, next: Koa.Next) => {
    console.log('[isAdmin Middleware] Checking user:', JSON.stringify(ctx.state.user, null, 2));
    if (ctx.state.user && ctx.state.user.roles && ctx.state.user.roles.includes('admin')) {
        console.log('[isAdmin Middleware] User is admin. Proceeding.');
        await next();
    } else {
        console.log('[isAdmin Middleware] User is NOT admin or roles are missing. Access denied.');
        ctx.status = 403;
        ctx.body = { error: 'Forbidden: You do not have permission to perform this action.' };
    }
};

export const getHotelsFromDB = async (ctx: Koa.Context) => {
    try {
        const hotels = await hotelModel.getAllFullHotelsData();
        ctx.status = 200;
        ctx.body = hotels;
    } catch (error: any) {
        console.error("Error fetching hotels from DB:", error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to retrieve hotels from database', details: error.message };
    }
};

export const refreshHotelsData = async (ctx: Koa.Context) => {
    console.log("Attempting to refresh hotel data...");
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = crypto.SHA256(HOTELBEDS_API_KEY + HOTELBEDS_API_SECRET + timestamp).toString(crypto.enc.Hex);
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const checkInDate = tomorrow.toISOString().split('T')[0];

        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        const checkOutDate = dayAfterTomorrow.toISOString().split('T')[0];
        const destinationCode = 'NYC';

        const requestBodyToHotelbeds = {
            stay: { checkIn: checkInDate, checkOut: checkOutDate },
            occupancies: [{ rooms: 1, adults: 2, children: 0 }],
            destination: { code: destinationCode },
            filter: { maxHotels: 500 },
            settings: {
                fields: ["name", "code", "categoryName", "destinationName", "zoneName", "currency", "minRate", "maxRate", "rooms"]
            }
        };

        console.log(`Fetching hotels from Hotelbeds API for destination: ${destinationCode}`);
        const availabilityResponse = await axios.post<HotelbedsHotelsResponse>(
            `${HOTELBEDS_API_URI}/hotels`,
            requestBodyToHotelbeds,
            {
                headers: {
                    'Api-key': HOTELBEDS_API_KEY,
                    'X-Signature': signature,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Accept-Encoding': 'gzip',
                },
            }
        );

        const availableHotels = availabilityResponse.data.hotels?.hotels;
        
        if (!availableHotels || availableHotels.length === 0) {
            console.log(`No hotels found for destination ${destinationCode} from API.`);
        } else {
             console.log(`Found ${availableHotels.length} hotels for ${destinationCode} from API.`);
        }

        await hotelModel.deleteAllHotelsData();
        console.log("Cleared existing hotel data from DB.");

        if (!availableHotels || availableHotels.length === 0) {
             ctx.status = 200;
             ctx.body = { message: `No hotels found from API for destination ${destinationCode}. Database cleared.` };
             return;
        }

        const dbHotelsToSave: hotelModel.DbHotel[] = availableHotels.map(apiHotel => ({
            code: apiHotel.code,
            name: apiHotel.name,
            category_name: apiHotel.categoryName,
            destination_name: apiHotel.destinationName,
            zone_name: apiHotel.zoneName,
            currency: apiHotel.currency,
            min_rate: apiHotel.minRate,
            max_rate: apiHotel.maxRate,
            available_rooms: 0,
            last_updated: new Date(),
        }));
        const savedDbHotels = await hotelModel.saveHotelsBatch(dbHotelsToSave);
        console.log(`Saved ${savedDbHotels.length} hotel bases to DB.`);

        const hotelCodesForContent = savedDbHotels.map(h => h.code);
        const CHUNK_SIZE = 200;
        let allSavePromises: Promise<void>[] = [];

        for (let i = 0; i < hotelCodesForContent.length; i += CHUNK_SIZE) {
            const chunkHotelCodes = hotelCodesForContent.slice(i, i + CHUNK_SIZE);
            if (chunkHotelCodes.length === 0) continue;

            const contentTimestamp = Math.floor(Date.now() / 1000);
            const contentSignature = crypto.SHA256(HOTELBEDS_API_KEY + HOTELBEDS_API_SECRET + contentTimestamp).toString(crypto.enc.Hex);
            
            console.log(`Fetching content for ${chunkHotelCodes.length} hotels (chunk ${Math.floor(i/CHUNK_SIZE) + 1})`);
            try {
                const contentResponse = await axios.get<HotelContentProxyResponse>(
                    `${HOTELBEDS_CONTENT_API_URI}/hotels/${chunkHotelCodes.join(',')}/details?language=ENG&useSecondaryLanguage=false`,
                    {
                        headers: {
                            'Api-key': HOTELBEDS_API_KEY,
                            'X-Signature': contentSignature,
                            'Accept': 'application/json',
                            'Accept-Encoding': 'gzip',
                        },
                    }
                );

                const hotelContents = contentResponse.data.hotels;
                console.log(`[Chunk ${Math.floor(i/CHUNK_SIZE) + 1}] Received ${hotelContents?.length || 0} hotel content objects. Codes: ${hotelContents?.map(hc => hc.code).join(', ')}`);

                if (hotelContents && hotelContents.length > 0) {
                    const imagesToSave: hotelModel.DbHotelImage[] = [];
                    for (const content of hotelContents) {
                        console.log(`[Chunk ${Math.floor(i/CHUNK_SIZE) + 1}] Processing content for hotel code: ${content.code}`);
                        console.log(`[Chunk ${Math.floor(i/CHUNK_SIZE) + 1}] Raw content.images:`, JSON.stringify(content.images?.slice(0,2)));
                        console.log(`[Chunk ${Math.floor(i/CHUNK_SIZE) + 1}] Raw content.content?.images:`, JSON.stringify(content.content?.images?.slice(0,2)));

                        const hotelApiData = availableHotels.find(h => h.code === content.code);
                        const imagesFromContent = content?.images || content?.content?.images;
                        console.log(`[Chunk ${Math.floor(i/CHUNK_SIZE) + 1}] Extracted imagesFromContent for hotel ${content.code}: ${imagesFromContent ? imagesFromContent.length : 0} images found.`);

                        if (imagesFromContent && imagesFromContent.length > 0) {
                             const mainImage = imagesFromContent.sort((a, b) => a.visualOrder - b.visualOrder || a.order - b.order)[0];
                            console.log(`[Chunk ${Math.floor(i/CHUNK_SIZE) + 1}] Main image selected for hotel ${content.code}:`, JSON.stringify(mainImage));
                            if (mainImage && mainImage.path) {
                                const imagePath = `http://photos.hotelbeds.com/giata/${mainImage.path}`;
                                imagesToSave.push({
                                    hotel_code: content.code,
                                    image_path: imagePath,
                                });
                                console.log(`[Chunk ${Math.floor(i/CHUNK_SIZE) + 1}] Prepared image to save for hotel ${content.code}: ${imagePath}`);
                            } else {
                                console.log(`[Chunk ${Math.floor(i/CHUNK_SIZE) + 1}] No mainImage.path found for hotel ${content.code}.`);
                            }
                        } else {
                            console.log(`[Chunk ${Math.floor(i/CHUNK_SIZE) + 1}] No imagesFromContent for hotel ${content.code}.`);
                        }
                        if (hotelApiData && hotelApiData.rooms) {
                             const roomsForDb: { room_code: string; name?: string; rates: Omit<hotelModel.DbHotelRoomRate, 'id' | 'hotel_room_id'>[] }[] = hotelApiData.rooms.map(apiRoom => ({
                                room_code: apiRoom.code,
                                name: apiRoom.name,
                                rates: apiRoom.rates.map(apiRate => ({
                                    rate_key: apiRate.rateKey,
                                    rate_class: apiRate.rateClass,
                                    rate_type: apiRate.rateType,
                                    net: apiRate.net,
                                    selling_rate: apiRate.sellingRate,
                                    hotel_mandatory: apiRate.hotelMandatory,
                                    adults: apiRate.adults,
                                    children: apiRate.children,
                                    rooms_in_rate: apiRate.rooms,
                                    board_name: apiRate.boardName,
                                }))
                            }));
                            allSavePromises.push(
                                hotelModel.saveRoomsAndRatesForHotel(content.code, roomsForDb)
                                    .then(() => console.log(`Successfully processed rooms/rates for hotel ${content.code}`))
                                    .catch(e => console.error(`Error saving rooms/rates for hotel ${content.code}:`, e))
                            );
                        }
                    }
                    if (imagesToSave.length > 0) {
                       console.log(`[Chunk ${Math.floor(i/CHUNK_SIZE) + 1}] Attempting to save ${imagesToSave.length} images to DB for this chunk.`);
                       allSavePromises.push(
                           hotelModel.saveHotelImagesBatch(imagesToSave)
                            .then(() => console.log(`Successfully saved ${imagesToSave.length} images for current chunk.`))
                            .catch(e => console.error(`Error saving batch of images:`, e))
                       );
                    } else {
                        console.log(`[Chunk ${Math.floor(i/CHUNK_SIZE) + 1}] No images to save to DB for this chunk.`);
                    }
                }
            } catch (contentError: any) {
                console.error(`Error fetching/saving content for hotels ${chunkHotelCodes.join(',')}:`, 
                    contentError.response?.data || contentError.message);
            }
        }
        
        await Promise.allSettled(allSavePromises);
        console.log("All save operations (images, rooms, rates) have been settled.");

        console.log("Hotel data refresh process completed.");
        ctx.status = 200;
        ctx.body = { message: 'Hotel data refresh completed successfully.', refreshedHotelsCount: savedDbHotels.length };

    } catch (error: any) {
        console.error("Error refreshing hotel data:", error.response?.data || error.message);
        ctx.status = 500;
        ctx.body = { error: 'Failed to refresh hotel data', details: error.response?.data?.error?.message || error.message };
    }
};

export const createHotel = async (ctx: Koa.Context) => {
    try {
        const hotelData = ctx.request.body as Omit<hotelModel.DbHotel, 'last_updated'>;
        if (!hotelData || !hotelData.code || !hotelData.name) {
            ctx.status = 400;
            ctx.body = { error: 'Hotel code and name are required.' };
            return;
        }

        const existingHotel = await hotelModel.getFullHotelDataByCode(hotelData.code);
        if (existingHotel) {
            ctx.status = 409;
            ctx.body = { error: `Hotel with code ${hotelData.code} already exists.` };
            return;
        }

        const newHotel = await hotelModel.createHotelEntry(hotelData);
        ctx.status = 201;
        ctx.body = newHotel;
    } catch (error: any) {
        console.error("Error in createHotel controller:", error);
        if (error.message && error.message.includes("duplicate key value violates unique constraint")) {
            ctx.status = 409;
            ctx.body = { error: `Hotel with code ${ (ctx.request.body as any)?.code } already exists.` , details: error.message };
        } else {
            ctx.status = 500;
            ctx.body = { error: 'Failed to create hotel', details: error.message };
        }
    }
};

export const updateHotel = async (ctx: Koa.Context) => {
    try {
        const hotelCode = parseInt(ctx.params.hotelCode, 10);
        if (isNaN(hotelCode)) {
            ctx.status = 400;
            ctx.body = { error: 'Invalid hotel code parameter.' };
            return;
        }

        const hotelData = ctx.request.body as Partial<Omit<hotelModel.DbHotel, 'code' | 'last_updated'>>;
        if (Object.keys(hotelData).length === 0) {
            ctx.status = 400;
            ctx.body = { error: 'No data provided for update.' };
            return;
        }

        const updatedHotel = await hotelModel.updateHotelEntry(hotelCode, hotelData);
        if (updatedHotel) {
            ctx.status = 200;
            ctx.body = updatedHotel;
        } else {
            ctx.status = 404;
            ctx.body = { error: `Hotel with code ${hotelCode} not found.` };
        }
    } catch (error: any) {
        console.error("Error in updateHotel controller:", error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to update hotel', details: error.message };
    }
};

export const deleteHotel = async (ctx: Koa.Context) => {
    try {
        const hotelCode = parseInt(ctx.params.hotelCode, 10);
        if (isNaN(hotelCode)) {
            ctx.status = 400;
            ctx.body = { error: 'Invalid hotel code parameter.' };
            return;
        }

        const result = await hotelModel.deleteHotelEntry(hotelCode);
        if (result.deleted) {
            ctx.status = 200;
            ctx.body = { message: `Hotel with code ${hotelCode} deleted successfully.` };
        } else {
            ctx.status = 404;
            ctx.body = { error: result.message || `Hotel with code ${hotelCode} not found.` };
        }
    } catch (error: any) {
        console.error("Error in deleteHotel controller:", error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to delete hotel', details: error.message };
    }
}; 