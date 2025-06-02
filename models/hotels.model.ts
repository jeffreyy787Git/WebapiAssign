import { Pool } from 'pg';
import { config as dbConfig } from '../config';

export interface DbHotel {
    code: number;
    name: string;
    category_name?: string;
    destination_name?: string;
    zone_name?: string;
    currency?: string;
    min_rate?: number;
    max_rate?: number;
    available_rooms?: number;
    last_updated: Date;
}

export interface DbHotelImage {
    id?: number;
    hotel_code: number;
    image_path: string;
}

export interface DbHotelRoom {
    id?: number;
    hotel_code: number;
    room_code: string;
    name?: string;
}

export interface DbHotelRoomRate {
    id?: number;
    hotel_room_id: number;
    rate_key: string;
    rate_class?: string;
    rate_type?: string;
    net: number;
    selling_rate?: number;
    hotel_mandatory?: boolean;
    adults?: number;
    children?: number;
    rooms_in_rate?: number;
    board_name?: string;
}

const pool = new Pool({
  user: dbConfig.user,
  host: dbConfig.host,
  database: dbConfig.database,
  password: dbConfig.password,
  port: dbConfig.port,
});

export const deleteAllHotelsData = async (): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM hotels');
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error deleting all hotels data:", error);
        throw error;
    } finally {
        client.release();
    }
};

export const saveHotelsBatch = async (hotels: DbHotel[]): Promise<DbHotel[]> => {
    if (!hotels || hotels.length === 0) {
        return [];
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const savedHotels: DbHotel[] = [];

        for (const hotel of hotels) {
            const query = `
                INSERT INTO hotels (code, name, category_name, destination_name, zone_name, currency, min_rate, max_rate, available_rooms, last_updated)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    category_name = EXCLUDED.category_name,
                    destination_name = EXCLUDED.destination_name,
                    zone_name = EXCLUDED.zone_name,
                    currency = EXCLUDED.currency,
                    min_rate = EXCLUDED.min_rate,
                    max_rate = EXCLUDED.max_rate,
                    available_rooms = COALESCE(EXCLUDED.available_rooms, hotels.available_rooms),
                    last_updated = NOW()
                RETURNING *;
            `;
            const values = [
                hotel.code, hotel.name, hotel.category_name, hotel.destination_name,
                hotel.zone_name, hotel.currency, hotel.min_rate, hotel.max_rate,
                hotel.available_rooms === undefined ? 0 : hotel.available_rooms
            ];
            const result = await client.query(query, values);
            if (result.rows[0]) {
                savedHotels.push(result.rows[0]);
            }
        }
        await client.query('COMMIT');
        return savedHotels;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in saveHotelsBatch:", error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Retrieves all hotels from the database.
 */
export const getAllHotels = async (): Promise<DbHotel[]> => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM hotels ORDER BY name ASC');
        return result.rows;
    } catch (error) {
        console.error("Error getting all hotels:", error);
        throw error;
    } finally {
        client.release();
    }
};


// --- Functions to interact with 'hotel_images' table ---

export const saveHotelImagesBatch = async (images: DbHotelImage[]): Promise<void> => {
    if (!images || images.length === 0) {
        return;
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Optional: Clear existing images for these hotels before inserting new ones
        // const hotelCodes = [...new Set(images.map(img => img.hotel_code))];
        // if (hotelCodes.length > 0) {
        //    await client.query('DELETE FROM hotel_images WHERE hotel_code = ANY($1::int[])', [hotelCodes]);
        // }

        for (const image of images) {
            const query = `
                INSERT INTO hotel_images (hotel_code, image_path)
                VALUES ($1, $2)
                ON CONFLICT (hotel_code, image_path) DO NOTHING;
            `;
            await client.query(query, [image.hotel_code, image.image_path]);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in saveHotelImagesBatch:", error);
        throw error;
    } finally {
        client.release();
    }
};

export const getImagesForHotel = async (hotelCode: number): Promise<DbHotelImage[]> => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM hotel_images WHERE hotel_code = $1', [hotelCode]);
        return result.rows;
    } catch (error) {
        console.error(`Error getting images for hotel ${hotelCode}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

export const saveRoomsAndRatesForHotel = async (
    hotelCode: number,
    roomsData: { room_code: string; name?: string; rates: Omit<DbHotelRoomRate, 'id' | 'hotel_room_id'>[] }[]
): Promise<void> => {
    if (!roomsData || roomsData.length === 0) {
        return;
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // First, delete existing rooms (and their rates due to cascade) for this hotel
        // This simplifies logic, but for updates, you'd need a more granular approach.
        await client.query('DELETE FROM hotel_rooms WHERE hotel_code = $1', [hotelCode]);

        for (const room of roomsData) {
            const roomInsertQuery = `
                INSERT INTO hotel_rooms (hotel_code, room_code, name)
                VALUES ($1, $2, $3)
                RETURNING id;
            `;
            const roomResult = await client.query(roomInsertQuery, [hotelCode, room.room_code, room.name]);
            const newRoomId = roomResult.rows[0]?.id;

            if (newRoomId && room.rates && room.rates.length > 0) {
                for (const rate of room.rates) {
                    const rateInsertQuery = `
                        INSERT INTO hotel_room_rates (
                            hotel_room_id, rate_key, rate_class, rate_type, net, selling_rate,
                            hotel_mandatory, adults, children, rooms_in_rate, board_name
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        ON CONFLICT (rate_key) DO UPDATE SET
                            rate_class = EXCLUDED.rate_class,
                            rate_type = EXCLUDED.rate_type,
                            net = EXCLUDED.net,
                            selling_rate = EXCLUDED.selling_rate,
                            hotel_mandatory = EXCLUDED.hotel_mandatory,
                            adults = EXCLUDED.adults,
                            children = EXCLUDED.children,
                            rooms_in_rate = EXCLUDED.rooms_in_rate,
                            board_name = EXCLUDED.board_name;
                    `;
                    await client.query(rateInsertQuery, [
                        newRoomId, rate.rate_key, rate.rate_class, rate.rate_type,
                        rate.net, rate.selling_rate, rate.hotel_mandatory,
                        rate.adults, rate.children, rate.rooms_in_rate, rate.board_name
                    ]);
                }
            }
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error saving rooms and rates for hotel ${hotelCode}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

export type DbRoomWithRates = DbHotelRoom & { rates: DbHotelRoomRate[] };

/**
 * Retrieves rooms and their rates for a given hotel code.
 */
export const getRoomsAndRatesForHotel = async (hotelCode: number): Promise<DbRoomWithRates[]> => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT
                r.id as room_id, r.room_code, r.name as room_name,
                rr.id as rate_id, rr.rate_key, rr.rate_class, rr.rate_type, rr.net,
                rr.selling_rate, rr.hotel_mandatory, rr.adults, rr.children,
                rr.rooms_in_rate, rr.board_name
            FROM hotel_rooms r
            LEFT JOIN hotel_room_rates rr ON r.id = rr.hotel_room_id
            WHERE r.hotel_code = $1
            ORDER BY r.id, rr.id;
        `;
        const result = await client.query(query, [hotelCode]);
        const roomsMap = new Map<number, DbRoomWithRates>();
        result.rows.forEach(row => {
            if (!roomsMap.has(row.room_id)) {
                roomsMap.set(row.room_id, {
                    id: row.room_id,
                    hotel_code: hotelCode,
                    room_code: row.room_code,
                    name: row.room_name,
                    rates: []
                });
            }
            if (row.rate_id) {
                const currentRoom = roomsMap.get(row.room_id);
                if (currentRoom) {
                    currentRoom.rates.push({
                        id: row.rate_id,
                        hotel_room_id: row.room_id,
                        rate_key: row.rate_key,
                        rate_class: row.rate_class,
                        rate_type: row.rate_type,
                        net: row.net,
                        selling_rate: row.selling_rate,
                        hotel_mandatory: row.hotel_mandatory,
                        adults: row.adults,
                        children: row.children,
                        rooms_in_rate: row.rooms_in_rate,
                        board_name: row.board_name
                    });
                }
            }
        });
        return Array.from(roomsMap.values());
    } catch (error) {
        console.error(`Error getting rooms and rates for hotel ${hotelCode}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

// You might also want a function to get a single hotel with all its details (images, rooms, rates)
// This would involve joining the tables or making multiple queries.
// Example:
export interface FullHotelData extends DbHotel {
    images: DbHotelImage[];
    rooms: DbRoomWithRates[];
}

export const getFullHotelDataByCode = async (hotelCode: number): Promise<FullHotelData | null> => {
    const client = await pool.connect();
    let hotel: DbHotel | null = null;
    try {
        const hotelResult = await client.query('SELECT * FROM hotels WHERE code = $1', [hotelCode]);
        if (hotelResult.rows.length === 0) {
            client.release(); // Release client if hotel not found
            return null;
        }
        hotel = hotelResult.rows[0] as DbHotel;
        // These functions handle their own client connections and releases
        const images = await getImagesForHotel(hotelCode);
        const roomsWithRates = await getRoomsAndRatesForHotel(hotelCode);

        return {
            ...hotel,
            images,
            rooms: roomsWithRates,
        };
    } catch (error) {
        console.error(`Error in getFullHotelDataByCode for hotel ${hotelCode}:`, error);
        throw error;
    } finally {
        // Ensure client is released only if it hasn't been released already (e.g. in case of !hotel)
        // However, getImagesForHotel and getRoomsAndRatesForHotel manage their own clients.
        // The client from this function's scope needs to be released.
        if (client) client.release();
    }
};


export const getAllFullHotelsData = async (): Promise<FullHotelData[]> => {
    const client = await pool.connect();
    try {
        const hotelsResult = await client.query('SELECT * FROM hotels ORDER BY name ASC');
        const dbHotels: DbHotel[] = hotelsResult.rows;
        if (dbHotels.length === 0) {
             client.release();
             return [];
        }

        const fullHotelsData: FullHotelData[] = [];

        for (const hotel of dbHotels) {
            // These functions manage their own client connections
            const images = await getImagesForHotel(hotel.code);
            const roomsWithRates = await getRoomsAndRatesForHotel(hotel.code);
            fullHotelsData.push({
                ...hotel,
                images,
                rooms: roomsWithRates,
            });
        }
        console.log('[getAllFullHotelsData] Returning full hotels data:', JSON.stringify(fullHotelsData.slice(0, 1), null, 2));
        return fullHotelsData;
    } catch (error) {
        console.error("Error getting all full hotels data:", error);
        throw error;
    } finally {
        if (client) client.release();
    }
};

export const createHotelEntry = async (hotelData: Omit<DbHotel, 'last_updated'>): Promise<DbHotel> => {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO hotels (code, name, category_name, destination_name, zone_name, currency, min_rate, max_rate, available_rooms, last_updated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING *;
        `;
        const values = [
            hotelData.code, hotelData.name, hotelData.category_name, hotelData.destination_name,
            hotelData.zone_name, hotelData.currency, hotelData.min_rate, hotelData.max_rate,
            hotelData.available_rooms === undefined ? 0 : hotelData.available_rooms
        ];
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error("Error in createHotelEntry:", error);
        throw error;
    } finally {
        client.release();
    }
};

export const updateHotelEntry = async (hotelCode: number, hotelData: Partial<Omit<DbHotel, 'code' | 'last_updated'>>): Promise<DbHotel | null> => {
    const client = await pool.connect();
    
    const fields = Object.keys(hotelData) as (keyof typeof hotelData)[];
    if (fields.length === 0) {
        client.release();
        throw new Error("No fields provided for update.");
    }

    const setClauses = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = fields.map(field => hotelData[field]);
    values.unshift(hotelCode);

    try {
        const query = `
            UPDATE hotels
            SET ${setClauses}, last_updated = NOW()
            WHERE code = $1
            RETURNING *;
        `;
        const result = await client.query(query, values);
        return result.rows[0] || null;
    } catch (error) {
        console.error(`Error in updateHotelEntry for hotel ${hotelCode}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

export const deleteHotelEntry = async (hotelCode: number): Promise<{ deleted: boolean; message?: string }> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query('DELETE FROM hotels WHERE code = $1', [hotelCode]);
        await client.query('COMMIT');
        if (result.rowCount && result.rowCount > 0) {
            return { deleted: true };
        }
        return { deleted: false, message: "Hotel not found or already deleted." };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error in deleteHotelEntry for hotel ${hotelCode}:`, error);
        throw error;
    } finally {
        client.release();
    }
};