import Router from 'koa-router';
import { register } from '../controllers/auth';

const router = new Router({ prefix: '/api/v1/users' });

router.post('/register', register);

export { router }; 