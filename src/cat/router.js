 import Router from 'koa-router';
import catStore from './store';
import { broadcast } from "../utils";

export const router = new Router();

router.get('/', async (ctx) => {
  const response = ctx.response;
  const userId = ctx.state.user._id;
  response.body = await catStore.find({ userId });
  response.status = 200; // ok
});

router.get('/:id', async (ctx) => {
  const userId = ctx.state.user._id;
  const cat = await catStore.findOne({ _id: ctx.params.id });
  const response = ctx.response;
  if (cat) {
    if (cat.userId === userId) {
      response.body = cat;
      response.status = 200; // ok
    } else {
      response.status = 403; // forbidden
    }
  } else {
    response.status = 404; // not found
  }
});

const createCat = async (ctx, cat, response) => {
  try {
    const userId = ctx.state.user._id;
    cat.userId = userId;
    response.body = await catStore.insert(cat);
    response.status = 201; // created
    broadcast(userId, { type: 'created', payload: cat });
  } catch (err) {
    response.body = { message: err.message };
    response.status = 400; // bad request
  }
};

router.post('/', async ctx => await createCat(ctx, ctx.request.body, ctx.response));

router.put('/:id', async (ctx) => {
  const cat = ctx.request.body;
  const id = ctx.params.id;
  const catId = cat._id;
  const response = ctx.response;
  if (catId && catId !== id) {
    response.body = { message: 'Param id and body _id should be the same' };
    response.status = 400; // bad request
    return;
  }
  if (!catId) {
    await createCat(ctx, cat, response);
  } else {
    const userId = ctx.state.user._id;
    cat.userId = userId;
    const updatedCount = await catStore.update({ _id: id }, cat);
    if (updatedCount === 1) {
      response.body = cat;
      response.status = 200; // ok
      broadcast(userId, { type: 'updated', payload: cat });
    } else {
      response.body = { message: 'Resource no longer exists' };
      response.status = 405; // method not allowed
    }
  }
});

router.del('/:id', async (ctx) => {
  const userId = ctx.state.user._id;
  const cat = await catStore.findOne({ _id: ctx.params.id });
  if (cat && userId !== cat.userId) {
    ctx.response.status = 403; // forbidden
  } else {
    await catStore.remove({ _id: ctx.params.id });
    ctx.response.status = 204; // no content
  }
});
