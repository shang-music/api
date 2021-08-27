const encodeNames = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#039;': "'",
};

const decodeName = (str = '') => {
  return str.replace(/(?:&amp;|&lt;|&gt;|&quot;|&apos;|&#039;)/gm, (s) => {
    return (encodeNames as any)[s];
  });
};


export { decodeName };
