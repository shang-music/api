const config = {
  provider: 'ovva-kuwo',
  request: {
    baseUrl: 'https://ovooa.com/API/kwdg/api.php',
    json: true,
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
    },
    rejectUnauthorized: false,
  },
  searchOne: {
    url: '/',
    qs: {
      sc: 1,
      n: 1,
      msg: '{{keyword}}',
    },

    result: `{
      id: .data.musicname, 
      name: .data.musicname, 
      artists: [{name: .data.singer}], 
      url: .data.musicurl, 
      picture: .data.image,
    }`,
  },
};

export default config;
