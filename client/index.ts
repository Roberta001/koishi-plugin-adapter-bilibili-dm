import Settings from './settings.vue';
import { Context } from '@koishijs/client';

export default (ctx: Context) =>
{
  ctx.slot({
    type: 'plugin-details',
    component: Settings,
    order: 800,
  });
};