import passport from "koa-passport";
import { BasicStrategy } from "passport-http";
import { RouterContext } from "koa-router";
import * as users from '../models/users.model';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import * as hotels from '../models/hotels.model';

const ADMIN_SIGNUP_CODE = 'TRAVEL2025';

const avatarUploadPathForController = path.join(process.cwd(), 'uploads', 'avatars');

if (!fs.existsSync(avatarUploadPathForController)) {
  fs.mkdirSync(avatarUploadPathForController, { recursive: true });
}

interface UserWithSensitiveInfo extends users.User {
    password?: string;
    passwordsalt?: string;
}

const verifyPassword = (userFromDb: UserWithSensitiveInfo, passwordAttempt: string) => {
  if (!userFromDb.password || !userFromDb.passwordsalt) {
    console.error('User object from DB is missing password or passwordsalt');
    return false;
  }
  const hashAttempt = crypto.pbkdf2Sync(passwordAttempt, userFromDb.passwordsalt, 100000, 16, 'sha256').toString('hex');
  return userFromDb.password === hashAttempt;
};

passport.use(new BasicStrategy(async (username, password, done) => {
  let result: UserWithSensitiveInfo[] = [];
  try {
    result = await users.findByUsername(username) as UserWithSensitiveInfo[];
  } catch(error) {
    console.error(`Error during authentication for user ${username}: ${error}`);
    return done(error as Error);
  }
  if(result.length) {
    const user = result[0];
    if(verifyPassword(user, password)) {
      const { password: _p, passwordsalt: _ps, ...secureUser } = user;
      return done(null, secureUser);
    } else {
      console.log(`Password incorrect for ${username}`);
      return done(null, false);
    }
  } else {
    console.log(`No such user ${username}`);
    return done(null, false);
  }
}));

export const basicAuth = async (ctx: RouterContext, next: any) => {
  return passport.authenticate("basic", { session: false }, (err: any, user: any, info: any, status: any) => {
    if (err) {
      ctx.status = 500;
      ctx.body = { message: "Authentication error", error: err.message };
      return;
    }
    if (!user) {
      ctx.status = status || 401;
      ctx.body = { message: (info && typeof info === 'object' && info.message) ? info.message : 'You are not authorized' };
      return;
    }
    ctx.state.user = user;
    return next();
  })(ctx, next);
};

export const register = async (ctx: RouterContext) => {
  const { username, email, password, signupCode } = ctx.request.body as any;

  if (!username || !email || !password) {
    ctx.status = 400;
    ctx.body = { message: "Username, email, and password are required." };
    return;
  }

  try {
    const existingUser = await users.findByUsername(username);
    if (existingUser && existingUser.length > 0) {
      ctx.status = 409;
      ctx.body = { message: "Username already exists." };
      return;
    }
  } catch (error: any) {
    console.error("Error checking existing username:", error);
    ctx.status = 500;
    ctx.body = { message: "Error during registration.", error: error.message };
    return;
  }

  const salt = crypto.randomBytes(8).toString('hex');
  const hashedPassword = crypto.pbkdf2Sync(password, salt, 100000, 16, 'sha256').toString('hex');

  try {
    const userRole = (signupCode === ADMIN_SIGNUP_CODE) ? 'admin' : 'normal_user';

    const creationResult = await users.createUser({
      username: username,
      email: email,
      passwordhash: hashedPassword,
      passwordsalt: salt,
      roles: userRole
    });

    let userToReturn: UserWithSensitiveInfo | null = null;

    if (Array.isArray(creationResult) && creationResult.length > 0) {
      userToReturn = creationResult[0] as UserWithSensitiveInfo;
    } else if (creationResult && typeof creationResult === 'object' && Reflect.has(creationResult, 'lastID') && Reflect.get(creationResult, 'changes') > 0) {
      userToReturn = { id: Reflect.get(creationResult, 'lastID'), username, email } as UserWithSensitiveInfo;
    } else if (creationResult && typeof creationResult === 'object' && !Array.isArray(creationResult) && Object.keys(creationResult).length > 0){
        userToReturn = creationResult as UserWithSensitiveInfo;
    }

    if (userToReturn) {
      delete userToReturn.password;
      delete userToReturn.passwordsalt;

      ctx.status = 201;
      ctx.body = { message: "User registered successfully", user: userToReturn };
    } else {
      console.error("User creation result was not as expected or indicated failure:", creationResult);
      throw new Error("User creation did not return expected user data.");
    }
  } catch (error: any) {
    console.error("Error creating user:", error);
    ctx.status = 500;
    ctx.body = { message: "Error during registration.", error: error.message };
  }
};

export const verifyLogin = async (ctx: RouterContext) => {
  if (ctx.state.user) {
    ctx.status = 200;
    ctx.body = {
      message: "Credentials verified successfully.",
      user: ctx.state.user
    };
  } else {
    console.error('[verifyLogin] ctx.state.user is not set after basicAuth. This should not happen.');
    ctx.status = 401;
    ctx.body = { message: "Verification failed. Credentials may be invalid or an internal error occurred." };
  }
};

export const updateAvatar = async (ctx: RouterContext) => {
  const fileFromRequest = ctx.request.files?.avatar as any;

  console.log('Entering updateAvatar with koa-body. ctx.request.body:', ctx.request.body);
  console.log('Entering updateAvatar with koa-body. ctx.request.files:', ctx.request.files);
  console.log('File object (avatar from request): ', fileFromRequest);

  if (!ctx.state.user || !ctx.state.user.id) {
    ctx.status = 401;
    ctx.body = { message: "User not authenticated" };
    if (fileFromRequest && fileFromRequest.filepath && fs.existsSync(fileFromRequest.filepath)) {
        fs.unlink(fileFromRequest.filepath, err => { if(err) console.error("Error deleting orphaned temp file (auth fail, koa-body):", err); });
    }
    return;
  }

  const actualFile = Array.isArray(fileFromRequest) ? fileFromRequest[0] : fileFromRequest;

  if (!actualFile || !actualFile.filepath) {
    ctx.status = 400;
    ctx.body = { message: "No file uploaded or file path missing (using koa-body)." };
    return;
  }

  let oldAvatarSystemPath: string | null = null;
  const userId = ctx.state.user.id;

  try {
    const currentUserDataArray = await users.findByUsername(ctx.state.user.username);
    if (currentUserDataArray.length > 0) {
      const currentUserData = currentUserDataArray[0] as users.User;
      if (currentUserData.avatarurl && currentUserData.avatarurl.startsWith('/uploads/avatars/')) {
        oldAvatarSystemPath = path.join(process.cwd(), currentUserData.avatarurl);
        console.log(`Old avatar system path to be deleted: ${oldAvatarSystemPath}`);
      }
    }
  } catch (e: any) {
    console.error("Error fetching user data for old avatar deletion:", e.message);
  }

  const tempPath = actualFile.filepath;
  const originalFilename = actualFile.originalFilename || actualFile.name || 'unknown.tmp'; 
  const originalExt = path.extname(originalFilename);
  const newFileName = `user-${userId}-${Date.now()}${originalExt}`;
  const newPath = path.join(avatarUploadPathForController, newFileName);

  try {
    await fs.promises.rename(tempPath, newPath);

    const avatarUrl = `/uploads/avatars/${newFileName}`;

    const updateResult = await users.updateUserAvatar(userId, avatarUrl);
    
    let updatedUser: users.User | null = null;
    if (Array.isArray(updateResult) && updateResult.length > 0) {
        updatedUser = updateResult[0] as users.User;
    } else if (updateResult && typeof updateResult === 'object' && !Array.isArray(updateResult) && Object.keys(updateResult).length > 0){
        updatedUser = updateResult as users.User;
    }

    if (updatedUser) {
      const { password, passwordsalt, ...secureUser } = updatedUser as any;
      ctx.status = 200;
      ctx.body = { message: "Avatar updated successfully", user: secureUser };

      if (oldAvatarSystemPath && fs.existsSync(oldAvatarSystemPath)) {
        const newAvatarSystemPath = newPath; 
        if (oldAvatarSystemPath !== newAvatarSystemPath) {
          console.log(`Attempting to delete old avatar: ${oldAvatarSystemPath}`);
          fs.unlink(oldAvatarSystemPath, (err) => {
            if (err) {
              console.error("Failed to delete old avatar:", oldAvatarSystemPath, err);
            } else {
              console.log("Successfully deleted old avatar:", oldAvatarSystemPath);
            }
          });
        }
      } else if (oldAvatarSystemPath) {
        console.log("Old avatar path was determined, but file does not exist (or was already deleted):", oldAvatarSystemPath);
      }

    } else {
      console.error("DB Avatar update did not return expected user data (koa-body) for ID:", userId);
      if (fs.existsSync(newPath)) {
        fs.unlink(newPath, err => { if (err) console.error("Error deleting newly uploaded file after DB update failure (koa-body):", err);});
      }
      ctx.status = 404; 
      ctx.body = { message: "Failed to update avatar in DB or retrieve user (koa-body)." };
    }
  } catch (error: any) {
    console.error("Error during avatar update (koa-body - rename or DB):", error);
    if (fs.existsSync(tempPath) && (!fs.existsSync(newPath) || tempPath !== newPath) ) { 
      fs.unlink(tempPath, (unlinkErr) => {
        if (unlinkErr) console.error("Error deleting temp file after caught error (koa-body):", unlinkErr);
      });
    }
    ctx.status = 500;
    ctx.body = { message: "Error updating avatar (koa-body)", error: error.message };
  }
};

export const getFavouriteHotels = async (ctx: RouterContext) => {
  if (!ctx.state.user || !ctx.state.user.id) {
    ctx.status = 401;
    ctx.body = { message: "User not authenticated" };
    return;
  }
  const userId = ctx.state.user.id;
  try {
    const userFromState = ctx.state.user as users.User; 

    if (userFromState && userFromState.favourite_hotels && userFromState.favourite_hotels.length > 0) {
      const favouriteHotelDetails = await hotels.findHotelsByCodes(userFromState.favourite_hotels);
      ctx.status = 200;
      ctx.body = { favouriteHotels: favouriteHotelDetails };
    } else {
      ctx.status = 200; 
      ctx.body = { favouriteHotels: [] };
    }
  } catch (error: any) {
    console.error("Error fetching favourite hotels for user:", userId, error);
    ctx.status = 500;
    ctx.body = { message: "Error fetching favourite hotels", error: error.message };
  }
};

export const addFavouriteHotel = async (ctx: RouterContext) => {
  if (!ctx.state.user || !ctx.state.user.id) {
    ctx.status = 401;
    ctx.body = { message: "User not authenticated" };
    return;
  }
  const userId = ctx.state.user.id;
  const { hotelCode } = ctx.request.body as { hotelCode?: number };

  if (typeof hotelCode !== 'number') {
    ctx.status = 400;
    ctx.body = { message: "hotelCode (number) is required in the request body." };
    return;
  }

  try {
    const updatedUser = await users.addHotelToFavourites(userId, hotelCode);
    if (updatedUser) {
      const { password, passwordsalt, ...secureUser } = updatedUser as any;
      ctx.status = 200;
      ctx.body = { message: "Hotel added to favourites", user: secureUser };
    } else {
      ctx.status = 404;
      ctx.body = { message: "Failed to add hotel to favourites or user not found." };
    }
  } catch (error: any) {
    console.error("Error adding hotel to favourites:", userId, hotelCode, error);
    ctx.status = 500;
    ctx.body = { message: "Error adding hotel to favourites", error: error.message };
  }
};

export const removeFavouriteHotel = async (ctx: RouterContext) => {
  if (!ctx.state.user || !ctx.state.user.id) {
    ctx.status = 401;
    ctx.body = { message: "User not authenticated" };
    return;
  }
  const userId = ctx.state.user.id;
  const hotelCodeParam = ctx.params.hotelCode;
  const hotelCode = parseInt(hotelCodeParam, 10);

  if (isNaN(hotelCode)) {
    ctx.status = 400;
    ctx.body = { message: "Valid hotelCode (number) is required as a URL parameter." };
    return;
  }

  try {
    const updatedUser = await users.removeHotelFromFavourites(userId, hotelCode);
    if (updatedUser) {
      const { password, passwordsalt, ...secureUser } = updatedUser as any;
      ctx.status = 200;
      ctx.body = { message: "Hotel removed from favourites", user: secureUser };
    } else {
      ctx.status = 404;
      ctx.body = { message: "Failed to remove hotel from favourites, user not found, or hotel not in favourites." };
    }
  } catch (error: any) {
    console.error("Error removing hotel from favourites:", userId, hotelCode, error);
    ctx.status = 500;
    ctx.body = { message: "Error removing hotel from favourites", error: error.message };
  }
};

export const loginController = async (ctx: RouterContext) => {
  if (ctx.state.user) {
    ctx.status = 200;
    ctx.body = {
      message: "Login successful",
      user: ctx.state.user 
    };
  } else {
    console.error('[loginController] ctx.state.user is not set after basicAuth. This implies an issue or direct call without auth.');
    ctx.status = 401;
    ctx.body = { message: "Login failed: Authentication unsuccessful or user data not available." };
  }
};