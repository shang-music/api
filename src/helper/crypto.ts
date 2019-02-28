import {
  BinaryLike, constants, createCipheriv, publicEncrypt, randomBytes
} from 'crypto';

const iv = Buffer.from('0102030405060708');
const presetKey = Buffer.from('0CoJUm6Qyw8W8jud');
const linuxapiKey = Buffer.from('rFgB&h#%2?^eDg:Q');
const base62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const publicKey = '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB\n-----END PUBLIC KEY-----';

const aesEncrypt = (buffer: BinaryLike, mode: string, key: Uint8Array, ivStr: BinaryLike) => {
  const cipher = createCipheriv(`aes-128-${mode}`, key, ivStr);
  return Buffer.concat([cipher.update(buffer), cipher.final()]);
};

const rsaEncrypt = (buffer: Uint8Array, key: string) => {
  let data = Buffer.concat([Buffer.alloc(128 - buffer.length), buffer]);
  return publicEncrypt({ key, padding: constants.RSA_NO_PADDING }, data);
};

const weapi = (object: object) => {
  const text = JSON.stringify(object);
  const secretKey = randomBytes(16).map((n) => {
    return base62.charAt(n % 62).charCodeAt(0);
  });
  return {
    params: aesEncrypt(
      Buffer.from(aesEncrypt(Buffer.from(text), 'cbc', presetKey, iv).toString('base64')),
      'cbc',
      secretKey,
      iv
    ).toString('base64'),
    encSecKey: rsaEncrypt(secretKey.reverse(), publicKey).toString('hex'),
  };
};

const linuxapi = (object: object) => {
  const text = JSON.stringify(object);
  return {
    eparams: aesEncrypt(Buffer.from(text), 'ecb', linuxapiKey, '')
      .toString('hex')
      .toUpperCase(),
  };
};

export { weapi, linuxapi };
