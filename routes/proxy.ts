import Router from 'koa-router';
import axios from 'axios';
import crypto from 'crypto-js';
import Koa from 'koa';
import NodeCache from 'node-cache';

const contentCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

const router = new Router({ prefix: '/api/v1/proxy' });

const HOTELBEDS_API_KEY = '9fd9017beb50107aab2b981cbef50a9d';
const HOTELBEDS_API_SECRET = '5d70d1df46';
const HOTELBEDS_API_URI = 'https://api.test.hotelbeds.com/hotel-api/1.0';
const HOTELBEDS_CONTENT_API_URI = 'https://api.test.hotelbeds.com/hotel-content-api/1.0';

router.post('/hotels', async (ctx: Koa.Context) => {
  try {
    const requestBodyFromFrontend = ctx.request.body;

    if (!requestBodyFromFrontend || typeof requestBodyFromFrontend !== 'object' || !('stay' in requestBodyFromFrontend) || !('occupancies' in requestBodyFromFrontend)) {
      ctx.status = 400;
      ctx.body = { error: 'Invalid request body from frontend.' };
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.SHA256(HOTELBEDS_API_KEY + HOTELBEDS_API_SECRET + timestamp).toString(crypto.enc.Hex);

    const headersToHotelbeds = {
      'Api-key': HOTELBEDS_API_KEY,
      'X-Signature': signature,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip',
    };

    console.log('Proxying request to Hotelbeds API with body:', JSON.stringify(requestBodyFromFrontend, null, 2));
    console.log('Headers to Hotelbeds:', JSON.stringify(headersToHotelbeds, null, 2));


    const responseFromHotelbeds = await axios.post(
      `${HOTELBEDS_API_URI}/hotels`,
      requestBodyFromFrontend,
      {
        headers: headersToHotelbeds,
      }
    );
    
    console.log('Received response from Hotelbeds API. Status:', responseFromHotelbeds.status);
    ctx.status = responseFromHotelbeds.status;
    ctx.body = responseFromHotelbeds.data;

  } catch (error: any) {
    console.error('Error in Hotelbeds proxy:', error.response?.data || error.message);
    if (error && error.isAxiosError && error.response) {
      ctx.status = error.response.status || 500;
      ctx.body = error.response.data || { error: 'Error proxying request to Hotelbeds' };
    } else {
      ctx.status = 500;
      ctx.body = { error: 'Internal server error in proxy', details: error.message };
    }
  }
});

router.get('/hotel-content', async (ctx: Koa.Context) => {
  const hotelCodes = ctx.query.hotelCodes as string;
  const language = (ctx.query.language as string) || 'ENG';

  if (!hotelCodes) {
    ctx.status = 400;
    ctx.body = { error: 'Missing hotelCodes query parameter.' };
    return;
  }

  const cacheKey = `hotelContent-${hotelCodes}-${language}`;
  const cachedContent = contentCache.get(cacheKey);

  if (cachedContent) {
    console.log(`[Cache HIT] Returning cached content for key: ${cacheKey}`);
    ctx.status = 200;
    ctx.body = cachedContent;
    return;
  }

  console.log(`[Cache MISS] Fetching content from API for key: ${cacheKey}`);

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.SHA256(HOTELBEDS_API_KEY + HOTELBEDS_API_SECRET + timestamp).toString(crypto.enc.Hex);

    const headersToHotelbeds = {
      'Api-key': HOTELBEDS_API_KEY,
      'X-Signature': signature,
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
    };

    const url = `${HOTELBEDS_CONTENT_API_URI}/hotels/${hotelCodes}/details?language=${language}&useSecondaryLanguage=false`;
    console.log(`Proxying request to Hotelbeds Content API: ${url}`);
    console.log('Headers to Hotelbeds Content API:', JSON.stringify(headersToHotelbeds, null, 2));

    const responseFromHotelbedsContent = await axios.get(url, {
      headers: headersToHotelbeds,
    });

    console.log('Received response from Hotelbeds Content API. Status:', responseFromHotelbedsContent.status);
    
    contentCache.set(cacheKey, responseFromHotelbedsContent.data);
    
    ctx.status = responseFromHotelbedsContent.status;
    ctx.body = responseFromHotelbedsContent.data;

  } catch (error: any) {
    console.error('Error in Hotelbeds Content proxy:', error.response?.data || error.message);
    if (error && error.isAxiosError && error.response) {
      ctx.status = error.response.status || 500;
      ctx.body = error.response.data || { error: 'Error proxying request to Hotelbeds Content API' };
    } else {
      ctx.status = 500;
      ctx.body = { error: 'Internal server error in content proxy', details: error.message };
    }
  }
});

export { router };