figma.showUI(__html__, { width: 320, height: 300 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'load-settings') {
    const [adjectivesUrl, colorsUrl, animalsUrl, mode, format] = await Promise.all([
      figma.clientStorage.getAsync('adjectivesUrl'),
      figma.clientStorage.getAsync('colorsUrl'),
      figma.clientStorage.getAsync('animalsUrl'),
      figma.clientStorage.getAsync('mode'),
      figma.clientStorage.getAsync('format')
    ]);
    
    figma.ui.postMessage({ 
      type: 'settings', 
      adjectivesUrl, 
      colorsUrl, 
      animalsUrl, 
      mode, 
      format 
    });
    return;
  }

  if (msg.type === 'generate-name') {
    const { wordLists, mode, format, urls } = msg;
    
    await Promise.all([
      figma.clientStorage.setAsync('adjectivesUrl', urls.adjectives),
      figma.clientStorage.setAsync('colorsUrl', urls.colors),
      figma.clientStorage.setAsync('animalsUrl', urls.animals),
      figma.clientStorage.setAsync('mode', mode),
      figma.clientStorage.setAsync('format', format)
    ]);

    const getWord = (list: string[], mode: string): string => {
      if (!list?.length) return 'undefined';
      
      const longWords = list.filter(w => w.length > 7);
      const shortWords = list.filter(w => w.length <= 7);
      
      if (mode === 'long' && longWords.length > 0) {
        return longWords[Math.floor(Math.random() * longWords.length)];
      }
      if (mode === 'short' && shortWords.length > 0) {
        return shortWords[Math.floor(Math.random() * shortWords.length)];
      }
      return list[Math.floor(Math.random() * list.length)];
    };

    const generateName = (): string => {
      const adj = getWord(wordLists.adjectives, mode);
      const color = getWord(wordLists.colors, mode);
      const animal = getWord(wordLists.animals, mode);
      let name = `${adj} ${color} ${animal}`;

      if (format === 'capitalized') {
        name = name.replace(/\b\w/g, c => c.toUpperCase());
      } else if (format === 'kebab') {
        name = name.toLowerCase().replace(/ /g, '-');
      } else {
        name = name.toLowerCase();
      }

      return name;
    };

    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.notify("Select one or more text layers.");
      figma.closePlugin();
      return;
    }

    try {
      for (const node of selection) {
        if (node.type === 'TEXT') {
          const name = generateName();

          if (node.hasMissingFont) {
            figma.notify("One or more selected text layers have missing fonts.");
            continue;
          }
          
          const len = node.characters.length;
          
          if (node.fontName === figma.mixed) {
            const fontNames = new Set<string>();
            for (let i = 0; i < len; i++) {
              const fontName = node.getRangeFontName(i, i + 1);
              if (typeof fontName !== 'symbol') {
                fontNames.add(`${fontName.family}-${fontName.style}`);
                await figma.loadFontAsync(fontName);
              }
            }
          } else {
            const fontName = node.fontName;
            if (typeof fontName !== 'symbol') {
              await figma.loadFontAsync(fontName);
            }
          }
          
          node.characters = name;
        }
      }

      figma.closePlugin("Names applied to selected text.");
    } catch (err) {
      figma.closePlugin("Failed to apply names.");
    }
  }
};
