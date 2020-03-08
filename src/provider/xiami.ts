import { decode } from 'he';
import get from 'lodash/get';
import isPlainObject from 'lodash/isPlainObject';
import { CoreOptions } from 'request';
import rp from 'request-promise';

import { Privilege } from '../common/privilege';
import { Provider } from '../common/provider';
import { RankType } from '../common/rank';
import { ISearchItem, ISearchQuery, ISearchSong } from '../common/search';
import { ISong } from '../common/song';

class Xiami {
  private defaultConfig = {
    json: true,
    headers: {
      referer: 'http://h.xiami.com/', // must options
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    },
    timeout: 10000,
  };

  private request: typeof rp;

  constructor() {
    this.request = this.setRequestOptions();
  }

  private static parseSongList(songs: any[]) {
    return songs.map((song: any) => {
      return {
        privilege: Xiami.getPrivilege(song),
        provider: Provider.xiami,
        id: `${song.song_id}`,
        name: song.song_name,
        artists: [
          {
            id: `${song.artist_id}`,
            name: song.artist_name,
          },
        ],
        album: {
          id: `${song.album_id}`,
          name: song.album_name,
          img: song.album_logo,
        },
      };
    });
  }

  private static getPrivilege(songInfo: any) {
    let isListenFile = get(songInfo, 'listen_file');
    let isLocation = get(songInfo, 'location');

    if (isListenFile || isLocation) {
      return Privilege.allow;
    }

    return Privilege.deny;
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
    if (isPlainObject(query)) {
      return this.searchList(query as ISearchQuery);
    }
    return this.searchList({ keyword: query as string });
  }

  async getSong(id: string): Promise<ISong> {
    return this.getDetail(id);
  }

  async playlist(id: string): Promise<ISearchItem[]> {
    return this.getPlaylist(id);
  }

  async rank(type: RankType, limit = 100, skip = 0): Promise<ISearchItem[]> {
    let qs = {
      v: '2.0',
      app_key: '1',
      page: parseInt(`${skip / limit}`, 10) + 1,
      limit,
    };

    if (type === RankType.hot) {
      Object.assign(qs, {
        id: '101',
        r: 'rank/song-list',
      });
    } else {
      Object.assign(qs, {
        r: 'song/new',
      });
    }

    let result = await this.request({
      url: 'https://api.xiami.com/web',
      qs,
    });

    let songs = get(result, 'data', []);

    return songs.map((song: any) => {
      return {
        privilege: Privilege.unknown,
        provider: Provider.xiami,
        id: `${song.song_id}`,
        name: song.song_name,
        artists: [
          {
            name: song.singers,
          },
        ],
        needPay: song.need_pay_flag !== 0,
      };
    });
  }

  async album(id: string): Promise<ISearchItem[]> {
    return this.getAlbum(id);
  }

  private async searchList({
    keyword,
    skip = 0,
    limit = 10,
  }: ISearchQuery): Promise<ISearchSong[]> {
    let result = await this.request({
      url: 'http://api.xiami.com/web',
      method: 'POST',
      qs: {
        v: '2.0',
        key: keyword,
        page: parseInt(`${skip / limit}`, 10),
        limit,
        r: 'search/songs',
        app_key: 1,
      },
    });

    let songs = get(result, 'data.songs', []);

    return Xiami.parseSongList(songs);
  }

  private async getDetail(id: string): Promise<ISong> {
    let result = await this.request({
      url: 'http://api.xiami.com/web',
      method: 'POST',
      qs: {
        v: '2.0',
        app_key: 1,
        r: 'song/detail',
        id,
      },
    });
    let song = get(result, 'data.song', {});

    const url = song.listen_file;
    const privilege = url ? Privilege.allow : Privilege.deny;

    if (privilege === Privilege.deny) {
      return {
        privilege,
        id,
        name: '',
        url: '',
        lrc: '',
        album: {
          id: '',
          name: '',
          img: '',
        },
      };
    }

    return {
      privilege,
      id: `${song.song_id}`,
      name: get(song, 'song_name', ''),
      url,
      artists: [
        {
          id: get(song, 'artist_id'),
          name: get(song, 'artist_name'),
        },
      ],
      album: {
        id: `${song.album_id}`,
        name: decode(song.album_name),
        img: song.logo,
      },
      lrc: get(song, 'lyric'),
    };
  }

  private async getPlaylist(id: string) {
    let result = await this.request({
      method: 'GET',
      url: 'http://api.xiami.com/web',
      qs: {
        id,
        v: '2.0',
        app_key: '1',
        r: 'collect/detail',
      },
      headers: {
        referer: 'http://m.xiami.com/',
        host: 'api.xiami.com',
        'content-type': 'application/x-www-form-urlencoded',
      },
    });

    let songs = get(result, 'data.songs', []);

    return Xiami.parseSongList(songs);
  }

  private async getAlbum(id: string) {
    let result = await this.request({
      method: 'GET',
      url: 'http://api.xiami.com/web',
      qs: {
        id,
        v: '2.0',
        app_key: '1',
        r: 'album/detail',
      },
      headers: {
        referer: 'http://m.xiami.com/',
        host: 'api.xiami.com',
        'content-type': 'application/x-www-form-urlencoded',
      },
    });

    let songs = get(result, 'data.songs', []);

    return songs.map((song: any) => {
      return {
        provider: Provider.xiami,
        id: `${song.song_id}`,
        name: song.song_name,
        artists: [
          {
            id: `${song.artist_id}`,
            name: song.singers,
          },
        ],
        album: {
          id: `${song.album_id}`,
          name: song.album_name,
          img: song.album_logo,
        },
      };
    });
  }
}

export { Xiami };
