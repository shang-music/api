import { fromPairs, isPlainObject } from 'lodash';
import { run as jq } from '@s4p/node-jq';
import { CoreOptions } from 'request';
import rp from 'request-promise';
import { ISearchQuery, ISearchSong } from '../common/search';
import { ISong } from '../common/song';

export interface IAdapterConfig {
  provider?: string;
  request: Record<string, unknown>;

  searchOne?: {
    url: string;
    qs: Record<string, string | number>;
    result: string;
  };
  search?: {
    url: string;
    qs: Record<string, string | number>;
    result: string;
  };
  song?: {
    url: string;
    qs: Record<string, string | number>;
    result: string;
  };
  url?: {
    url: string;
    qs?: Record<string, string | number>;
    formData?: any;
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

  async searchOne(keyword: string): Promise<ISong> {
    const {
      result, url, qs = {}, ...requestOptions
    } = this.getConfig('searchOne');

    let qsTransformed = await Adapter.replaceQs(qs, { keyword });
    let urlTransformed = await Adapter.replaceString(url, { keyword });

    const data = await this.request({
      ...requestOptions,
      url: urlTransformed,
      qs: qsTransformed,
    });

    const rule = await Adapter.replaceString(result, { keyword });

    const song = await Adapter.transformResult(data, rule);
    return {
      provider: this.config.provider || 'adapter',
      ...song,
    };
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

    const { result, qs = {}, ...searchOptions } = this.getConfig('search');

    let qsTransformed = await Adapter.replaceQs(qs, params);

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
      result, ...requestOptions
    } = this.getConfig('song');

    let rot = await Adapter.replaceRequestOptions(requestOptions, { id });

    const data = await this.request(rot);

    const song = await Adapter.transformResult(data, result);
    return {
      provider: this.config.provider || 'adapter',
      ...song,
    };
  }

  async getUrl(id: string): Promise<string> {
    const {
      result, ...requestOptions
    } = this.getConfig('url');

    let rot: any = await Adapter.replaceRequestOptions(requestOptions, { id });

    const data = await this.request(rot);

    return Adapter.transformResult(data, result, { input: 'json', raw: true, output: 'string' });
  }

  private static async replaceString(str: string, params: Record<string, any>) {
    const list = str.match(/(?<={{)(.+)(?=}})/g);

    if (!list) {
      return str;
    }

    const jqList = await Promise.all(list.map((match) => {
      const v = match.trim();

      if (/\|/.test(v)) {
        const [key, rule] = v.split(/\s*\|\s*/);
        const value = (params[key.trim()] || key.trim());

        return Adapter.transformResult(value, rule, {
          input: 'string', rawInput: true, raw: true, output: 'string',
        });
      }

      return undefined;
    }));


    let index = -1;
    return str.replace(/{{(.+?)}}/, (_, $1) => {
      index += 1;

      const v = $1.trim();
      if (/\|/.test(v)) {
        return jqList[index];
      }

      return params[$1.trim()];
    });
  }

  private static async replaceRequestOptions(options: any, params: any): Promise<any> {
    if (Array.isArray(options)) {
      return Promise.all(options.map((v) => {
        return this.replaceRequestOptions(v, params);
      }));
    }

    if (!isPlainObject(options)) {
      return options;
    }

    const list = Object.keys(options);

    for (let i = 0; i < list.length; i += 1) {
      const key = list[i];
      const value = options[key];

      if (typeof value === 'string') {
        // eslint-disable-next-line no-await-in-loop
        const r = await Adapter.replaceString(value, params);

        options[key] = r;
      } else {
        // eslint-disable-next-line no-await-in-loop
        options[key] = await this.replaceRequestOptions(value, params);
      }
    }

    return options;
  }

  private static async replaceQs(qs: Record<string, string | number>, params: Record<string, any>) {
    const list = await Promise.all(
      Object.entries(qs).map(async ([key, value]) => {
        if (typeof value === 'number') {
          return [key, value];
        }

        const r = await Adapter.replaceString(value, params);
        return [key, r];
      })
    );

    return fromPairs(list);
  }

  private static async transformResult<T = any>(
    result: Record<string, any>,
    rule: string,
    options: Record<string, unknown> = { input: 'json', output: 'json' }
  ): Promise<T> {
    return jq(rule, result, options) as Promise<any>;
  }

  private getConfig(key: 'searchOne' | 'search' | 'song' | 'url') {
    const v = this.config[key];

    if (v === undefined) {
      throw new Error(`no support for provider: ${this.config.provider}; key: ${key}`);
    }
    return v;
  }
}

export { Adapter };
