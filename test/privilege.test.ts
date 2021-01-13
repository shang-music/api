import test from 'ava';

import {
  getSong, Provider, rank, RankType, search, playlist
} from '../src';
import { Privilege } from '../src/common/privilege';

type CheckInfo =
  | {
    provider: Provider;
    keyword: string;
    id?: undefined;
  }
  | {
    provider: Provider;
    id: string;
    keyword?: undefined;
  };

let testCaseMap = {
  [Privilege.allow]: [
    {
      provider: Provider.kugou,
      keyword: 'Aragaki Yui',
    },
    {
      provider: Provider.kugou,
      id: 'f3205f0ff2f4891a2c344086b74b6d6e',
    },

    {
      provider: Provider.netease,
      keyword: 'Aragaki Yui',
    },
    {
      provider: Provider.netease,
      id: '29829683',
    },
    {
      provider: Provider.netease,
      id: '1338695683',
    },
    {
      provider: Provider.netease,
      id: '1344897943',
    },
  ],
  [Privilege.deny]: [
    {
      provider: Provider.kugou,
      keyword: 'I FEEL GOOD (Remix) EXID HIPPITY HOP',
    },
    {
      provider: Provider.kugou,
      id: '41AC5854B48A8BFBE3DC43C1C414A464',
    },
    {
      provider: Provider.kugou,
      id: '8073553A6BED5343372176746741682D',
    },

    {
      provider: Provider.netease,
      keyword: '周杰伦 霍元甲 (电影 霍元甲 主题曲)',
    },
    {
      provider: Provider.netease,
      id: '418603077',
    },
    {
      provider: Provider.netease,
      id: '1345983806',
    },
  ],
};

async function getPrivilege({ provider, keyword, id }: CheckInfo) {
  if (keyword) {
    let [song] = await search(keyword, provider);
    return song.privilege;
  }

  if (id) {
    let song = await getSong(id, provider);
    return song.privilege;
  }

  throw new Error('no keyword or id found');
}

test('test privilege', async (t) => {
  await Promise.all(
    Object.keys(testCaseMap).map((key) => {
      let arr = testCaseMap[key as keyof typeof testCaseMap];
      return Promise.all(
        arr.map(async (item) => {
          let privilege = await getPrivilege(item);
          t.is(key, privilege, `privilege: ${privilege}, check: ${JSON.stringify(item)}`);
        })
      );
    })
  );
});

test('rank should have privilege', async (t) => {
  await Promise.all(
    [Provider.kugou, Provider.netease].map(async (provider) => {
      let list = await rank(provider, RankType.new);
      list.forEach((song) => {
        t.truthy(song.privilege);
      });
    })
  );
});

test('playlist should have privilege', async (t) => {
  await Promise.all(
    [
      {
        provider: Provider.kugou,
        playlist: '235427',
      },
      {
        provider: Provider.netease,
        playlist: '2471711264',
      },
    ].map(async ({ provider, playlist: id }) => {
      let list = await playlist(provider, id);
      list.forEach((song) => {
        t.truthy(song.privilege);
      });
    })
  );
});
