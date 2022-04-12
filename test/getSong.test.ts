import test from 'ava';

import { BitRate, getSong, Provider } from '../src';

import get = require('lodash/get');

const testCases = [
  {
    id: 'cde2ef1e41c58dad5683f50d3cf4da48',
    provider: Provider.kugou,

    check: {
      duration: 266,
      name: '小幸运',
      // artists: [{ id: 6046, name: '田馥甄' }],
      'artists[0].id': 6046,
      'artists[0].name': '田馥甄',
      // album:
      //  {
      //    id: 18758462,
      //    name: '小幸运',
      //    img:
      //     'http://imge.kugou.com/stdmusic/400/20190318/20190318193735709304.jpg',
      //  },
    },
  },
  {
    id: 'B5BB7A3D96835B00E3E835B7B5BC5FF7',
    provider: Provider.kugou,
  },
  {
    id: 'A781023E25C4D09EABCB307BE8BD12E8',
    provider: Provider.kugou,
  },
  {
    id: '29829683',
    provider: Provider.netease,
  },
];

test('getSong', async (t) => {
  await Promise.all(
    testCases.map(async ({ id, provider, check }) => {
      let data = await getSong(id, provider, BitRate.mid);

      let {
        id: resultId, name, url, album, artists, duration,
      } = data;

      t.is(resultId, id);
      t.truthy(name);
      t.truthy(url);
      t.truthy(album.id && album.name && album.img, `${id}-${provider}`);
      t.truthy(artists && artists[0].name && artists[0].id, `${id}-${provider}`);

      if (provider === Provider.kugou || provider === Provider.netease) {
        t.truthy(duration);
      }

      if (check) {
        Object.entries(check).forEach(([key, value]) => {
          t.is(get(data, key), value);
        });
      }
    })
  );
});

test('getSong with not support provider', async (t) => {
  let err;
  try {
    await getSong('id', 'unknown-provider' as Provider);
  } catch (e) {
    err = e;
  }

  t.truthy(err);
  t.is(err.message, 'unknown-provider not support');
});
