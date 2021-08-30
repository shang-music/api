import test from 'ava';
import Joi from 'joi';
import { Adapter } from '../src';
import qq from './ovva/qq';
import migu from './ovva/migu';
import kuwo from './ovva/kuwo';

const qqAdapter = new Adapter(qq);
const miguAdapter = new Adapter(migu);
const kuwoAdapter = new Adapter(kuwo);

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
  url: Joi.string().required(),
  picture: Joi.string().required(),
};

test.skip('qq searchOne', async (t) => {
  const song = await qqAdapter.searchOne('夜曲');
  const { error } = Joi.validate(song, schema, { convert: false, allowUnknown: true });
  t.is(error, null);
});

test.skip('migu searchOne', async (t) => {
  const song = await miguAdapter.searchOne('夜曲');
  const { error } = Joi.validate(song, schema, { convert: false, allowUnknown: true });
  t.is(error, null);
});

test('kuwo searchOne', async (t) => {
  const song = await kuwoAdapter.searchOne('小幸运 田馥甄');
  const { error } = Joi.validate(song, schema, { convert: false, allowUnknown: true });
  t.is(error, null);
});
