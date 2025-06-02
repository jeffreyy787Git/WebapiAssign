import * as db from "../helpers/database";

export interface User {
  id: number;
  username: string;
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  about?: string | null;
  dateregistered: string;
  avatarurl?: string | null;
}

export const findByUsername = async (username: string): Promise<any[]> => {
  const query = "SELECT * FROM users WHERE username = ?";
  const users = await db.run_query(query, [username]);
  return users;
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
  const query = "INSERT INTO users (username, email, password, passwordsalt, roles, dateregistered) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING id, username, email, dateregistered, firstname, lastname, about, avatarurl, roles";
  const result = await db.run_query(query, [username, email, passwordhash, passwordsalt, roles]);
  return result;
};

export const updateUserAvatar = async (userId: number, avatarUrl: string): Promise<any> => {
  const query = "UPDATE users SET avatarurl = ? WHERE id = ? RETURNING id, username, email, dateregistered, firstname, lastname, about, avatarurl, roles";
  const result = await db.run_query(query, [avatarUrl, userId]);
  return result;
};
