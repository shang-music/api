import test from 'ava';
import Joi from 'joi';
import { Adapter } from '../src';
import { ISearchSong } from '../src/common/search';
import qq from './adapters/qq2';

const qqAdapter = new Adapter(qq);

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
  album: Joi.object({
    name: Joi.string()
      .required()
      .allow(''),
    img: Joi.string(),
  }),
};

function shouldValid(searchResult: ISearchSong | ISearchSong[]) {
  let arr: ISearchSong[];
  if (!Array.isArray(searchResult)) {
    arr = [searchResult];
  } else {
    arr = searchResult;
  }

  return arr.map((item) => {
    let { error } = Joi.validate(item, schema, {
      convert: false,
      allowUnknown: true,
    });
    return error && error.toString();
  });
}

test('qq search', async (t) => {
  const arr = await qqAdapter.search('夜曲');
  t.deepEqual(shouldValid(arr), new Array(arr.length).fill(null));

  const song = arr[0];

  const url = await qqAdapter.getUrl(song.id);

  t.truthy(url);
});
