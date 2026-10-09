/* 首页那个终端问答的全部内容。
 *
 * 这里没有模型，没有 API，没有账单。每一句都是手写的，所以读到的人
 * 看到的是你想让他看到的那句话，一个字不差 —— 对一个讲职业经历的页面，
 * 这比「大概率说对」重要得多。说错一次「她好像做过游戏美术」，
 * 在 recruiter 那里就是减分。
 *
 * keys 是匹配用的。中英文都写：英文按词匹配，中文按子串匹配，
 * 所以中文词不用分词也能命中。宁可多写几个同义词，漏匹配比误匹配难受。
 *
 * 写答案的规矩（和简历同一套）：
 *   - 陈述句，短，先给事实再给判断
 *   - 不用破折号
 *   - 能带数字就带数字
 *   - 每条都要有去处，答完就把人送到作品页
 */

export type Answer = {
  id: string;
  /** 访客可能打的词。长的 key 权重更高，因为更具体。 */
  keys: string[];
  /** 这条问题在建议列表里怎么显示 */
  ask: string;
  /** 答案正文 */
  say: string;
  /** 答案底下的去处 */
  go?: { label: string; href: string }[];
  /** 进默认建议列表 */
  pin?: boolean;
};

export const ANSWERS: Answer[] = [
  {
    id: 'shipped',
    pin: true,
    ask: 'Has any of this actually shipped?',
    keys: [
      'shipped', 'ship', 'actually', 'real', 'really', 'commercial', 'client',
      'clients', 'production', 'produced', 'launched', 'launch', 'sold',
      'selling', 'retail', 'store', 'stores', 'shelf', 'shelves', 'market',
      'live', 'released', 'release', 'professional', 'paid',
      '落地', '上线', '商业', '真的', '量产', '发行', '上市', '卖',
    ],
    say:
      'Two of them have left the screen. The NUO2 rice wine range went to print and is selling in Beijing retail, including a counter at Parkview Green. The cover art and Spotify Canvas for 3Bangz’s single went out on Spotify and NetEase Cloud Music, with the design credit in the platform metadata.',
    go: [
      { label: 'NUO2, a range in stores', href: '/work/nuo2' },
      { label: 'I Am a Maggot, on Spotify', href: '/work/i-am-a-maggot' },
    ],
  },
  {
    id: 'branding',
    pin: true,
    ask: 'Do you do brand identity?',
    keys: [
      'brand', 'branding', 'brands', 'identity', 'vi', 'visual identity',
      'logo', 'logotype', 'logos', 'wordmark', 'rebrand', 'guidelines',
      'brand system', 'design system', 'positioning', 'strategy',
      '品牌', '标志', 'logo设计', '视觉识别', '品牌设计', '全案',
    ],
    say:
      'Yes. NUO2 is a full identity built from nothing: logotype, an eight module auxiliary shape system, a four colour palette, seven flavour illustrations, usage guidelines, and the label dielines that went to press. It covers the strategy deck too, not just the marks.',
    go: [{ label: 'The NUO2 identity', href: '/work/nuo2' }],
  },
  {
    id: 'packaging',
    ask: 'Have you done packaging that went to print?',
    keys: [
      'packaging', 'package', 'packages', 'label', 'labels', 'print',
      'printing', 'dieline', 'dielines', 'bottle', 'bottles', 'sku', 'skus',
      'cpg', 'fmcg', 'beverage', 'drink', 'food', 'press', 'prepress',
      '包装', '标签', '印刷', '刀版', '瓶', '出血',
    ],
    say:
      'Seven front labels and the regulatory backs, across eight bottle SKUs, plus gift boxes, apparel, bags and retail banners. Print ready dielines, colour calibration and dimensional checks through to the press. The range is in stores.',
    go: [{ label: 'NUO2 packaging', href: '/work/nuo2' }],
  },
  {
    id: 'illustration',
    pin: true,
    ask: 'Can I see the illustration work?',
    keys: [
      'illustration', 'illustrations', 'illustrator', 'illustrate', 'drawing',
      'draw', 'drawings', 'ink', 'painting', 'paint', 'hand drawn', 'handdrawn',
      'art', 'artwork', 'character', 'concept art', 'sketch', 'editorial',
      '插画', '手绘', '水墨', '画', '绘画', '美术',
    ],
    say:
      'Ink is the foundation. EDEN OF EAST is a mixed media series grounded in field interviews, built from sketch and material tests through to bookbinding. Otaku is nine ink panels on the shape of a life lived indoors. Both have shown in a gallery.',
    go: [
      { label: 'EDEN OF EAST', href: '/work/eden-of-east' },
      { label: 'The Person in a Culture Dish', href: '/work/otaku-culture-dish' },
      { label: 'Love in the Time of Borderline', href: '/work/love-borderline' },
    ],
  },
  {
    id: 'motion',
    ask: 'Do you do motion and animation?',
    keys: [
      'motion', 'animation', 'animate', 'animated', 'video', 'film', 'reel',
      'after effects', 'ae', 'stop motion', 'stopmotion', 'loop', 'canvas',
      'title', 'titles', 'sequence', 'broadcast', 'gif',
      '动画', '动态', '动效', '视频', '定格', '片头',
    ],
    say:
      'Three kinds. An 80 second mythology title sequence for Nine Lives. A stop motion piece for Waiting for Godot, shot frame by frame. And a silent vertical loop built to Spotify Canvas spec, which plays behind every stream of the 3Bangz single.',
    go: [
      { label: 'Nine Lives intro', href: '/work/nine-lives-intro' },
      { label: 'Waiting for Godot', href: '/work/waiting-for-godot' },
      { label: 'The Spotify Canvas', href: '/work/i-am-a-maggot' },
    ],
  },
  {
    id: 'game',
    pin: true,
    ask: 'What game work have you done?',
    keys: [
      'game', 'games', 'gaming', 'unity', 'unreal', 'card game', 'board game',
      'level', 'gameplay', 'game design', 'game art', 'narrative design',
      'prototype', 'interactive', 'playable',
      '游戏', '卡牌', '关卡', '交互', '玩法',
    ],
    say:
      'Nine Lives to Ruin a Kingdom is a narrative card game, art and system both. The Last Compact and For U are built in Unity, with custom HLSL shaders, procedural VFX and a decoupled event bus I wrote. The master’s concentration was game design.',
    go: [
      { label: 'Nine Lives card game', href: '/work/nine-lives-game' },
      { label: 'The Last Compact', href: '/work/the-last-compact' },
      { label: 'For U', href: '/work/for-u' },
    ],
  },
  {
    id: 'code',
    ask: 'Can you actually write code?',
    keys: [
      'code', 'coding', 'engineer', 'engineering', 'developer', 'develop',
      'programming', 'programmer', 'technical', 'shader', 'shaders', 'hlsl',
      'c#', 'csharp', 'javascript', 'html', 'css', 'astro', 'react',
      'front end', 'frontend', 'web dev', 'built this site', 'github',
      '代码', '编程', '开发', '技术', '着色器', '前端',
    ],
    say:
      'Yes. Unity and C# for the game work, multi pass HLSL shaders with procedural trails and UV slicing, and a 60 script codebase restructured into domain folders. This site is hand built in Astro with no template, which is probably the fastest way to check.',
    go: [
      { label: 'The Last Compact', href: '/work/the-last-compact' },
      { label: 'For U', href: '/work/for-u' },
      { label: 'Code on GitHub', href: 'https://github.com/luvsic707' },
    ],
  },
  {
    id: 'arvr',
    ask: 'Any AR or VR work?',
    keys: [
      'ar', 'vr', 'xr', 'augmented', 'virtual reality', 'immersive',
      'spatial', 'installation', 'headset', 'mixed reality',
      '增强现实', '虚拟现实', '沉浸', '空间',
    ],
    say:
      'The Last Compact is a spatial piece built in Unity. Contours of Hidden Pain uses AR to put a body’s invisible pain where you can walk around it. Both came out of research, not out of the tech.',
    go: [
      { label: 'The Last Compact', href: '/work/the-last-compact' },
      { label: 'Contours of Hidden Pain', href: '/work/contours-hidden-pain' },
    ],
  },
  {
    id: 'music',
    ask: 'Do you do album and music artwork?',
    keys: [
      'music', 'album', 'cover art', 'single', 'spotify', 'netease', 'rapper',
      'artist', 'band', 'record', 'label art', 'streaming', 'vinyl', 'canvas',
      '音乐', '专辑', '封面', '单曲', '说唱', '网易云',
    ],
    say:
      'One release so far, and it is a real one. Cover artwork and the Spotify Canvas loop for 3Bangz’s single, out on Spotify, NetEase Cloud Music and every major platform through Trendsetter Media. The design credit is in the Spotify metadata.',
    go: [{ label: 'I Am a Maggot', href: '/work/i-am-a-maggot' }],
  },
  {
    id: 'tattoo',
    ask: 'You tattoo as well?',
    keys: [
      'tattoo', 'tattoos', 'tattooing', 'ink work', 'flash', 'body art',
      'henna', 'skin',
      '纹身', '刺青', '海娜',
    ],
    say:
      'An ongoing practice under the name Red Thread, narrative pieces rather than flash. The drawing habit and the tattoo habit feed each other, which is why the illustration line looks the way it does.',
    go: [{ label: 'Tattoo Collection', href: '/work/tattoo-collection' }],
  },
  {
    id: 'exhibition',
    ask: 'Has the work been exhibited?',
    keys: [
      'exhibit', 'exhibited', 'exhibition', 'gallery', 'show', 'shown',
      'showing', 'melbourne', 'event', 'activation', 'curate', 'curated',
      'audience', 'public',
      '展览', '展出', '画廊', '策展', '墨尔本', '现场',
    ],
    say:
      'Between Selves, at Balam Balam Place in Melbourne, May 2026. It drew 300 plus attendees across a five hour window. 150 of them were engaged directly and 35 left with a custom henna piece, which made it the most photographed installation at the event.',
    go: [{ label: 'Between Selves', href: '/work/between-selves' }],
  },
  {
    id: 'bilingual',
    ask: 'Can you work in Chinese and English?',
    keys: [
      'chinese', 'mandarin', 'bilingual', 'language', 'languages', 'english',
      'translate', 'translation', 'china', 'asia', 'asian', 'cjk',
      'localisation', 'localization', 'market',
      '中文', '双语', '中英', '语言', '中国市场',
    ],
    say:
      'Both, including the parts that are hard to fake. Chinese typography, Chinese packaging regulation, and the Chinese social platforms. The NUO2 work ran end to end in that market while the delivery and documentation stayed in English.',
    go: [{ label: 'NUO2, built for the China market', href: '/work/nuo2' }],
  },
  {
    id: 'where',
    pin: true,
    ask: 'Where are you based, and are you available?',
    keys: [
      'where', 'based', 'location', 'located', 'city', 'toronto', 'canada',
      'ontario', 'remote', 'relocate', 'available', 'availability', 'hire',
      'hiring', 'freelance', 'contract', 'full time', 'fulltime', 'job',
      'work with', 'commission',
      '在哪', '哪里', '多伦多', '加拿大', '远程', '合作', '接活', '找工作',
    ],
    say:
      'Toronto. Open to full time, contract and freelance, and used to working remotely across time zones. The fastest route is email.',
    go: [
      { label: 'Get in touch', href: '/info' },
      { label: 'ruojingpu19@gmail.com', href: 'mailto:ruojingpu19@gmail.com' },
    ],
  },
  {
    id: 'contact',
    ask: 'How do I get in touch?',
    keys: [
      'contact', 'email', 'reach', 'get in touch', 'message', 'linkedin',
      'instagram', 'dm', 'talk', 'call', 'resume', 'cv', 'portfolio pdf',
      '联系', '邮箱', '简历', '微信',
    ],
    say:
      'Email is read first. LinkedIn and Instagram both work. A CV goes out on request, tailored to what you are hiring for.',
    go: [
      { label: 'ruojingpu19@gmail.com', href: 'mailto:ruojingpu19@gmail.com' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ruojing-pu-94067a33b/' },
      { label: 'Instagram', href: 'https://www.instagram.com/luvsic707/' },
    ],
  },
  {
    id: 'background',
    ask: 'What is your background?',
    keys: [
      'background', 'study', 'studied', 'school', 'degree', 'education',
      'university', 'master', 'masters', 'bfa', 'mfa', 'training', 'experience',
      'years', 'northeastern', 'about you', 'who are you',
      '背景', '学历', '专业', '毕业', '经历', '几年',
    ],
    say:
      'A BFA in visual communication, then a master’s in digital media with a game design concentration. The work before that was in house: brand and visual identity for one group in Chengdu, and social content design for another. The thread through all of it is drawing.',
    go: [{ label: 'The full record', href: '/info' }],
  },
  {
    id: 'ai',
    ask: 'Do you use AI in your process?',
    keys: [
      'ai', 'artificial intelligence', 'midjourney', 'generative', 'generate',
      'generated', 'stable diffusion', 'prompt', 'chatgpt', 'automation',
      'sora', 'model',
      '人工智能', '生成', '生成式',
    ],
    say:
      'Where it earns its place, and the site says so where it was used. The seven NUO2 flavour illustrations came out of a generative pipeline that was art directed: the collage language, the palette and the bottle silhouette crop were set first, then every output was composited and colour matched into one locked system. The ink drawings are drawn.',
    go: [{ label: 'The NUO2 illustration system', href: '/work/nuo2' }],
  },
];

/** 匹配不上时显示这几条。顺序就是优先级。 */
export const PINNED = ANSWERS.filter((a) => a.pin).map((a) => a.id);
