import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import {
  basicAuth, 
  register, 
  verifyLogin, 
  updateAvatar,
  getFavouriteHotels,
  addFavouriteHotel,
  removeFavouriteHotel,
  loginController
} from '../controllers/auth';

const router = new Router({ prefix: '/api/v1/auth' });

router.post('/login', basicAuth, loginController);

router.get('/verify', basicAuth, verifyLogin);

router.post('/register', bodyParser(), register);

router.put('/me/avatar', basicAuth, updateAvatar);

router.get('/me/favourites/hotels', basicAuth, getFavouriteHotels);
router.post('/me/favourites/hotels', basicAuth, bodyParser(), addFavouriteHotel);
router.delete('/me/favourites/hotels/:hotelCode', basicAuth, removeFavouriteHotel);

export { router }; 