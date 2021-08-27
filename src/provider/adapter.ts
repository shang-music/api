import { fromPairs } from 'lodash';
import { run as jq } from 'node-jq';
import { CoreOptions } from 'request';
import rp from 'request-promise';
import { ISearchQuery, ISearchSong } from '../common/search';
import { ISong } from '../common/song';

export interface IAdapterConfig {
  provider?: string;
  request: Record<string, unknown>;
  search: {
    url: string;
    qs: Record<string, string | number>;
    result: string;
  };
  song: {
    url: string;
    qs: Record<string, string | number>;
    result: string;
  };
  url: {
    url: string;
    qs: Record<string, string | number>;
    result: string;
  };
}

class Adapter {
  private request: typeof rp;

  // eslint-disable-next-line @typescript-eslint/no-parameter-properties
  constructor(private readonly config: IAdapterConfig) {
    this.request = this.setRequestOptions(this.config.request);
  }

  setRequestOptions(options: CoreOptions = {}) {
    this.request = rp.defaults(options);

    return this.request;
  }

  async search(query: string | ISearchQuery): Promise<ISearchSong[]> {
    let params = {
      page: 1,
      limit: 10,
      keyword: '',
    };

    if (typeof query === 'string') {
      params.keyword = query;
    }
    if (typeof query === 'object') {
      if (!query.keyword) {
        throw new Error('query need keyword');
      }
      params = { ...params, ...query };
    }


    if (!params.keyword) {
      throw new Error('query not support');
    }

    const { result, qs = {}, ...searchOptions } = this.config.search;

    let qsTransformed = Adapter.replaceQs(qs, params);

    const data = await this.request({
      ...searchOptions,
      qs: qsTransformed,
    });

    const list = await Adapter.transformResult(data, result);

    return list.filter((item: any) => {
      return item && item.id;
    }).map((item: any) => {
      return {
        provider: this.config.provider || 'adapter',
        ...item,
      };
    });
  }

  async getSong(id: string): Promise<ISong> {
    const {
      result, url, qs = {}, ...requestOptions
    } = this.config.song;

    let qsTransformed = Adapter.replaceQs(qs, { id });
    let urlTransformed = Adapter.replaceString(url, { id });

    const data = await this.request({
      ...requestOptions,
      url: urlTransformed,
      qs: qsTransformed,
    });

    const song = await Adapter.transformResult(data, result);
    return {
      provider: this.config.provider || 'adapter',
      ...song,
    };
  }

  async getUrl(id: string): Promise<string> {
    const {
      result, qs = {}, url, ...requestOptions
    } = this.config.url;

    let qsTransformed = Adapter.replaceQs(qs, { id });
    let urlTransformed = Adapter.replaceString(url, { id });

    const data = await this.request({
      ...requestOptions,
      url: urlTransformed,
      qs: qsTransformed,
    });

    return Adapter.transformResult(data, result, { input: 'json', output: 'string' });
  }

  private static replaceString(str: string, params: Record<string, any>) {
    return str.replace(/{{(.+)}}/, (_, $1) => {
      return params[$1.trim()];
    });
  }

  private static replaceQs(qs: Record<string, string | number>, params: Record<string, any>) {
    return fromPairs(Object.entries(qs).map(([key, value]) => {
      if (typeof value === 'number') {
        return [key, value];
      }

      return [key, Adapter.replaceString(value, params)];
    }));
  }

  private static async transformResult<T = any>(
    result: Record<string, any>,
    rule: string,
    options: Record<string, unknown> = { input: 'json', output: 'json' }
  ): Promise<T> {
    return jq(rule, result, options) as Promise<any>;
  }
}

export { Adapter };
