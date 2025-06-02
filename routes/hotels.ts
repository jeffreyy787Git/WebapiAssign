import Router from 'koa-router';
import { basicAuth } from '../controllers/auth';
import { isAdmin, getHotelsFromDB, refreshHotelsData, createHotel, updateHotel, deleteHotel } from '../controllers/hotels';

const router = new Router({ prefix: '/api/v1/db/hotels' });

router.get('/', getHotelsFromDB);

router.post('/refresh', basicAuth, isAdmin, refreshHotelsData);

router.post('/', basicAuth, isAdmin, createHotel);

router.put('/:hotelCode', basicAuth, isAdmin, updateHotel);

router.delete('/:hotelCode', basicAuth, isAdmin, deleteHotel);

export { router };