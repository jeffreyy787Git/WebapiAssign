import * as db from "../helpers/database";

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  passwordsalt?: string;
  firstname?: string | null;
  lastname?: string | null;
  about?: string | null;
  dateregistered: string;
  avatarurl?: string | null;
  roles?: string;
  favourite_hotels?: number[];
}

const parseFavouriteHotels = (dbValue: any): number[] => {
  if (Array.isArray(dbValue)) {
    const numbers = dbValue.filter(item => typeof item === 'number');
    if (numbers.length !== dbValue.length) {
      console.warn("parseFavouriteHotels: Some items in the array were not numbers:", dbValue);
    }
    return numbers;
  }

  if (typeof dbValue === 'number') {
    console.warn("parseFavouriteHotels: Received a single number, wrapping in an array:", dbValue);
    return [dbValue];
  }
  
  if (typeof dbValue === 'string') {
    if (dbValue.startsWith('{') && dbValue.endsWith('}')) {
        const innerContent = dbValue.substring(1, dbValue.length - 1);
        if (innerContent === '') return [];
        try {
            const parsedArray = innerContent.split(',').map(item => parseInt(item.trim(), 10));
            if (parsedArray.every(num => !isNaN(num))) {
                console.warn("parseFavouriteHotels: Parsed a string array literal:", dbValue, "->", parsedArray);
                return parsedArray;
            }
        } catch (e) {
            console.error("parseFavouriteHotels: Error parsing string array literal:", dbValue, e);
        }
    }
    try {
        const parsedJson = JSON.parse(dbValue);
        if (Array.isArray(parsedJson) && parsedJson.every(item => typeof item === 'number')) {
            console.warn("parseFavouriteHotels: Parsed a JSON string:", dbValue, "->", parsedJson);
            return parsedJson;
        }
    } catch (e) {
    }
    console.warn("parseFavouriteHotels: Received a string that was not a recognized array format or JSON array of numbers:", dbValue);
    return [];
  }

  if (dbValue === null || dbValue === undefined) {
    return [];
  }
  
  console.warn("parseFavouriteHotels: Unrecognized format for favourite_hotels, returning empty array. Value:", dbValue);
  return [];
};

const mapRowToUser = (row: any): User => {
  if (!row) return row;
  const { favourite_hotels, ...restOfRow } = row;
  return {
    ...restOfRow,
    favourite_hotels: parseFavouriteHotels(favourite_hotels)
  } as User;
};

export const findByUsername = async (username: string): Promise<User[]> => {
  const query = "SELECT id, username, email, password, passwordsalt, firstname, lastname, about, dateregistered, avatarurl, roles, favourite_hotels FROM users WHERE username = ?";
  const rows = await db.run_query(query, [username]);
  return rows.map(mapRowToUser);
};

export interface CreateUserParams {
  username: string;
  email: string;
  passwordhash: string;
  passwordsalt: string;
  roles: string;
}

export const createUser = async (userData: CreateUserParams): Promise<User[] | any> => {
  const { username, email, passwordhash, passwordsalt, roles } = userData;
  const initialFavouriteHotels = '[]';
  const query = "INSERT INTO users (username, email, password, passwordsalt, roles, dateregistered, favourite_hotels) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?) RETURNING id, username, email, dateregistered, firstname, lastname, about, avatarurl, roles, favourite_hotels";
  const insertResult = await db.run_insert(query, [username, email, passwordhash, passwordsalt, roles, initialFavouriteHotels]);
  
  let returnedData = insertResult.results;

  if (Array.isArray(returnedData) && returnedData.length > 0) {
    return returnedData.map(mapRowToUser);
  } else if (returnedData && typeof returnedData === 'object' && !Array.isArray(returnedData) && Object.keys(returnedData).length > 0 && 'id' in returnedData) {
    return [mapRowToUser(returnedData as any)];
  } else if (insertResult.metadata && typeof insertResult.metadata === 'object') {
    const meta = insertResult.metadata as any;
    if (typeof meta.lastID === 'number' && meta.lastID > 0 && typeof meta.changes === 'number' && meta.changes > 0) {
        const lastID = meta.lastID;
        const newUserQuery = "SELECT id, username, email, password, passwordsalt, firstname, lastname, about, dateregistered, avatarurl, roles, favourite_hotels FROM users WHERE id = ?";
        const newUsers = await db.run_query(newUserQuery, [lastID]);
        return newUsers.map(mapRowToUser);
    } else if (typeof meta.rowCount === 'number' && meta.rowCount > 0) {
        console.warn("createUser: Insert reported rowCount > 0 but no RETURNING data in results. Refetching might be needed if ID is not otherwise available.");
    }
  }
  console.warn("createUser: db.run_insert returned an unexpected result structure or insert failed:", insertResult);
  return [];
};

export const updateUserAvatar = async (userId: number, avatarUrl: string): Promise<User[] | any> => {
  const query = "UPDATE users SET avatarurl = ? WHERE id = ? RETURNING id, username, email, dateregistered, firstname, lastname, about, avatarurl, roles, favourite_hotels";
  const result = await db.run_query(query, [avatarUrl, userId]);
  if (Array.isArray(result) && result.length > 0) {
    return result.map(mapRowToUser);
  }
  return [];
};

const findUserByIdInternal = async (userId: number): Promise<User | null> => {
  const query = "SELECT id, username, email, password, passwordsalt, firstname, lastname, about, dateregistered, avatarurl, roles, favourite_hotels FROM users WHERE id = ?";
  const rows = await db.run_query(query, [userId]);
  if (rows && rows.length > 0) {
    return mapRowToUser(rows[0]);
  }
  return null;
};

export const addHotelToFavourites = async (userId: number, hotelCode: number): Promise<User | null> => {
  const user = await findUserByIdInternal(userId);
  if (!user) {
    console.log(`addHotelToFavourites: User ${userId} not found.`);
    return null;
  }

  let currentFavourites = user.favourite_hotels || [];
  if (!Array.isArray(currentFavourites)) {
      console.warn(`User ${userId} favourite_hotels was not an array after parsing:`, currentFavourites);
      currentFavourites = [];
  }

  if (!currentFavourites.includes(hotelCode)) {
    const updatedFavouritesArray = [...currentFavourites, hotelCode];
    const pgArrayString = `{${updatedFavouritesArray.join(',')}}`;
    const updateQuery = "UPDATE users SET favourite_hotels = ? WHERE id = ?";
    await db.run_update(updateQuery, [pgArrayString, userId]);
    return findUserByIdInternal(userId);
  }
  return user;
};

export const removeHotelFromFavourites = async (userId: number, hotelCode: number): Promise<User | null> => {
  const user = await findUserByIdInternal(userId);
  if (!user) {
    console.log(`removeHotelFromFavourites: User ${userId} not found.`);
    return null;
  }

  let currentFavourites = user.favourite_hotels || [];
   if (!Array.isArray(currentFavourites)) {
      console.warn(`User ${userId} favourite_hotels was not an array after parsing (remove):`, currentFavourites);
      currentFavourites = [];
  }
  
  if (currentFavourites.includes(hotelCode)) {
    const updatedFavouritesArray = currentFavourites.filter(code => code !== hotelCode);
    const pgArrayString = `{${updatedFavouritesArray.join(',')}}`;
    const updateQuery = "UPDATE users SET favourite_hotels = ? WHERE id = ?";
    await db.run_update(updateQuery, [pgArrayString, userId]);
    return findUserByIdInternal(userId);
  }
  return user;
};
