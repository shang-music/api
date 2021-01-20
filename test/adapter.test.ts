import test from 'ava';
import Joi from 'joi';

import { Adapter } from '../src';

// https://github.com/jsososo/QQMusicApi
const jsoso = {
  provider: 'jsososo',
  request: {
    baseUrl: 'https://api.qq.jsososo.com',
    json: true,
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
    },
  },
  search: {
    url: '/search',
    qs: {
      key: '{{keyword}}',
    },

    // https://jqplay.org/
    result:
      '[.data.list[] |  { id: .songmid, name: .songname, artists: [.singer[] |  { name: .name, id: .mid }] }]',
  },
  song: {
    url: '/song',
    qs: {
      songmid: '{{id}}',
    },

    result:
      '.data.track_info |  {id: .mid, name: .name, artists: [.singer[] |  {name: .name, id: .mid}] }',
  },
  url: {
    url: '/song/url',
    qs: {
      id: '{{id}}',
    },

    result: '.data',
  },
};

const adapter = new Adapter(jsoso);

const schema = {
  id: Joi.string().required(),
  name: Joi.string().required(),
  artists: Joi.array()
    .required()
    .min(1)
    .items(
      Joi.object({
        name: Joi.string().required(),
      })
    ),
};

function shouldValid(arr: any[]) {
  return arr.map((item) => {
    let { error } = Joi.validate(item, {
      provider: Joi.string().required(),
      ...schema,
    }, { convert: false, allowUnknown: true });
    return error && error.toString();
  });
}

test('adapter search', async (t) => {
  const arr = await adapter.search('泪了 曾沛慈');

  t.true(arr.length > 5);

  t.deepEqual(shouldValid(arr), new Array(arr.length).fill(null));
});

test('adapter getSong', async (t) => {
  const item = await adapter.getSong('000pnwNj24cMHw');

  let { error } = Joi.validate(item, {
    provider: Joi.string().required(),
    ...schema,
  }, { convert: false, allowUnknown: true });

  t.is(error, null);
});

test('adapter getUrl', async (t) => {
  const url = await adapter.getUrl('000pnwNj24cMHw');

  t.truthy(url);
});
