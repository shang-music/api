const qq = {
  provider: 'ovva-qq',
  request: {
    baseUrl: 'https://ovooa.com/API/QQ_Music',
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
      Skey: '',
      uin: '',
      n: 1,
      msg: '{{keyword}}',
    },

    result: `{
      id: ("adapter-ovva-qq-" + "{{ keyword }}"), 
      realId: .data.songid | tostring,
      name: .data.song, 
      artists: [{name: .data.singer}], 
      url: .data.music, 
      picture: .data.picture,  
    }`,
  },
  url: {
    url: '/',
    qs: {
      Skey: '',
      uin: '',
      n: 1,
      msg: '{{ id | sub("^adapter-ovva-qq-"; "") }}',
    },

    result: '.data.music',
  },
};

export default qq;
