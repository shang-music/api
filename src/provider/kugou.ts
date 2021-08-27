import { createHash } from 'crypto';
import get from 'lodash/get';
import { CoreOptions } from 'request';
import rp from 'request-promise';
import { Privilege } from '../common/privilege';
import { Provider } from '../common/provider';
import { RankType } from '../common/rank';
import { ISearchItem, ISearchQuery, ISearchSong } from '../common/search';
import { BitRate, ISong } from '../common/song';
import { formatStr } from '../common/util';
import { decodeName } from './helper';


class Kugou {
  private defaultConfig = {
    json: true,
    timeout: 10000,
  };

  private request: typeof rp;

  private bitRateMap = {
    [BitRate.mid]: 128,
    [BitRate.high]: 320,
    [BitRate.sq]: 'sq',
    [BitRate.hq]: 'hq',
  };

  constructor() {
    this.request = this.setRequestOptions();
  }

  private static getId(song: any) {
    return song.hash || song['320hash'] || song.sqhash;
  }

  private static getPrivilege(data: any): Privilege {
    let privilege = get(data, 'privilege', 0);
    let privilege2 = get(data, 'privilege2', 0);

    if (privilege2 === '1010') {
      return Privilege.deny;
    }

    if (privilege === 5) {
      return Privilege.deny;
    }

    if ([0, 8, 10].includes(privilege)) {
      return Privilege.allow;
    }

    return Privilege.unknown;
  }

  setRequestOptions(options?: CoreOptions) {
    if (!options) {
      this.request = rp.defaults(this.defaultConfig);
    } else {
      this.request = rp.defaults({
        ...this.defaultConfig,
        ...options,
      });
    }

    return this.request;
  }

  async search(query: string | ISearchQuery): Promise<ISearchSong[]> {
    if (typeof query === 'string') {
      return this.searchList({ keyword: query });
    }
    if (typeof query === 'object') {
      if (!query.keyword) {
        throw new Error('query need keyword');
      }
      return this.searchList(query);
    }
    throw new Error('query not support');
  }

  async getSong(id: string, br?: BitRate): Promise<ISong> {
    return this.getDetail(id, br);
  }

  async rank(type: RankType, limit = 500, skip = 0) {
    if (type === RankType.hot) {
      // 酷狗TOP500
      return this.concatRankList('8888', limit, skip);
    }

    // 酷狗飙升榜
    return this.concatRankList('6666', limit, skip);
  }

  async playlist(id: string) {
    return this.getSpecialSong(id);
  }

  async album(id: string) {
    return this.getAlbum(id);
  }

  // eslint-disable-next-line class-methods-use-this
  private async concatRankList(
    rankId: string,
    limit: number,
    skip: number
  ): Promise<ISearchItem[]> {
    let page = parseInt(`${skip / limit}`, 10) + 1;

    let result = await rp({
      method: 'GET',
      url: 'http://mobilecdn.kugou.com/api/v3/rank/song',
      qs: { pagesize: limit, page, rankid: rankId },
      headers: {
        host: 'mobilecdn.kugou.com',
      },
      json: true,
    });

    let songs = get(result, 'data.info', []);

    return songs.map((song: any) => {
      let filename = formatStr(song.filename);

      let [singer, songName] = filename.split('-');
      return {
        privilege: Kugou.getPrivilege(song),
        provider: Provider.kugou,
        id: Kugou.getId(song),
        name: formatStr(songName),
        artists: formatStr(singer)
          .split('、')
          .map((name) => {
            return {
              name,
            };
          }),
        mvId: song.mvhash,
      };
    });
  }

  private async searchList({
    keyword,
    skip = 0,
    limit = 10,
  }: ISearchQuery): Promise<ISearchSong[]> {
    let result = await this.request({
      url: 'http://ioscdn.kugou.com/api/v3/search/song',
      qs: {
        keyword,
        page: parseInt(`${skip / limit}`, 10),
        pagesize: limit,

        showtype: 10,
        plat: 2,
        version: 7910,
        tag: 1,
        correct: 1,
        privilege: 1,
        sver: 5,
      },
    });

    let songs = get(result, 'data.info', []);

    return songs.map((song: any) => {
      return {
        privilege: Kugou.getPrivilege(song),
        id: Kugou.getId(song),
        name: decodeName(song.songname),
        artists: decodeName(get(song, 'singername', ''))
          .split('、')
          .map((name: any) => {
            return {
              name,
            };
          }),
        album: {
          id: song.album_id,
          name: song.album_name,
        },
        duration: song.duration,
      };
    });
  }

  private async getDetail(id: string, br: BitRate = BitRate.mid): Promise<ISong> {
    const [r1, r2, r3] = await Promise.all([
      this.request({
        method: 'GET',
        url: 'http://trackercdn.kugou.com/i/v2/',
        qs: {
          key: createHash('md5')
            .update(`${id}kgcloudv2`)
            .digest('hex'),
          hash: id,
          appid: '1005',
          pid: '2',
          cmd: '25',
          behavior: 'play',
          br: this.bitRateMap[br],
        },
      }),
      this.request({
        method: 'GET',
        url: 'http://krcs.kugou.com/search',
        qs: {
          ver: 1,
          hash: id,
          man: 'no',
          client: 'mobi',
          cmd: '25',
          behavior: 'play',
          br: this.bitRateMap[br],
        },
      }),
      this.request({
        method: 'GET',
        url: 'http://kmrcdn.service.kugou.com/container/v1/image',
        qs: {
          appid: '0',
          clientver: '0',
          author_image_type: '5',
          data: `[{"hash":"${id}"}]`,
        },
      })
    ]);

    const url = get(r1, 'url[0]');
    const songName = get(r2, 'candidates[0].song', '');

    return {
      privilege: url ? Privilege.allow : Privilege.deny,
      id,
      duration: get(r1, 'timeLength'),
      name: (songName || '').trim(),
      url,
      lrc: '',
      artists: [
        {
          id: get(r3, 'data[0].author[0].author_id'),
          name: get(r3, 'data[0].author[0].author_name'),
        },
      ],
      album: {
        id: get(r3, 'data[0].album[0].album_id'),
        name: get(r3, 'data[0].album[0].album_name'),
        img: get(r3, 'data[0].album[0].sizable_cover', '').replace('{size}', '400'),
      },
    };
  }

  private async getSpecialSong(specialId: string): Promise<ISearchItem[]> {
    let result = await this.request({
      url: 'http://mobilecdnbj.kugou.com/api/v3/special/song',
      qs: {
        specialid: specialId,
        version: 8000,
        pagesize: 99999,
        format: 'jsonp',
      },
    });

    let songs = get(result, 'data.info', []);

    return songs.map((song: any) => {
      let filename = formatStr(song.filename);

      let [singer, songName] = filename.split('-');
      return {
        privilege: Kugou.getPrivilege(song),
        provider: Provider.kugou,
        id: Kugou.getId(song),
        name: formatStr(songName),
        artists: formatStr(singer)
          .split('、')
          .map((name) => {
            return {
              name,
            };
          }),
        mvId: song.mvhash,
      };
    });
  }

  private async getAlbum(id: string): Promise<ISearchItem[]> {
    let result = await this.request({
      url: 'http://m.kugou.com/app/i/getablum.php',
      qs: {
        type: 1,
        ablumid: id,
      },
    });

    let songs = get(result, 'list', []);

    return songs.map((song: any) => {
      let filename = formatStr(song.songname);

      let [singer, songName] = filename.split('-');
      return {
        provider: Provider.kugou,
        id: Kugou.getId(song),
        name: formatStr(songName),
        artists: formatStr(singer)
          .split('、')
          .map((name) => {
            return {
              name,
            };
          }),
      };
    });
  }
}

export { Kugou };
