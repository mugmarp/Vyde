export interface Video {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  channelColor: string;
  channelInitials: string;
  verified: boolean;
  views: string;
  duration: string;
  timestamp: string;
  thumbnail: number;
  category: string;
  description: string;
  likes: string;
}

export interface Channel {
  id: string;
  name: string;
  subscribers: string;
  color: string;
  initials: string;
  verified: boolean;
}

export interface DownloadItem {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: number;
  status: 'active' | 'queued' | 'completed';
  progress: number;
  sizeMB: number;
  etaSeconds?: number;
  speedMbps?: number;
}

export interface Playlist {
  id: string;
  name: string;
  count: number;
  isPrivate: boolean;
}

export const CATEGORIES = [
  'All', 'For You', 'Gaming', 'Music', 'Tech', 'Science', 'Travel', 'Sports', 'Comedy',
];

export const EXPLORE_CATEGORIES = [
  { id: 'gaming',  label: 'Gaming',  color: '#9B5DE5', icon: 'game-controller-outline' },
  { id: 'science', label: 'Science', color: '#E84A27', icon: 'planet-outline' },
  { id: 'tech',    label: 'Tech',    color: '#00B4D8', icon: 'hardware-chip-outline' },
  { id: 'travel',  label: 'Travel',  color: '#52B788', icon: 'airplane-outline' },
  { id: 'music',   label: 'Music',   color: '#F4A261', icon: 'musical-notes-outline' },
  { id: 'sports',  label: 'Sports',  color: '#3A7BD5', icon: 'football-outline' },
  { id: 'news',    label: 'News',    color: '#F72585', icon: 'newspaper-outline' },
  { id: 'comedy',  label: 'Comedy',  color: '#FFB703', icon: 'happy-outline' },
];

export const TRENDING_SEARCHES = [
  'Space documentary 2026',
  'AI chip engineering deep dive',
  'Tokyo night walk 4K',
  'Lo-fi study beats 3 hours',
  'Patagonia trekking guide',
  'World Finals highlights',
];

export const CHANNELS: Channel[] = [
  { id: 'ch1', name: 'Nebula Studios',  subscribers: '4.2M', color: '#E84A27', initials: 'NS', verified: true },
  { id: 'ch2', name: 'CityPulse',       subscribers: '2.8M', color: '#3A7BD5', initials: 'CP', verified: true },
  { id: 'ch3', name: 'TechForward',     subscribers: '6.1M', color: '#00B4D8', initials: 'TF', verified: true },
  { id: 'ch4', name: 'WildEarth',       subscribers: '3.5M', color: '#52B788', initials: 'WE', verified: true },
  { id: 'ch5', name: 'PixelArena',      subscribers: '8.9M', color: '#9B5DE5', initials: 'PA', verified: true },
  { id: 'ch6', name: 'SoundWave',       subscribers: '1.2M', color: '#F4A261', initials: 'SW', verified: false },
];

export const VIDEOS: Video[] = [
  {
    id: 'v1',
    title: 'The Observable Universe: A Journey to the Edge of Everything',
    channel: 'Nebula Studios', channelId: 'ch1', channelColor: '#E84A27', channelInitials: 'NS',
    verified: true, views: '3.1M', duration: '22:48', timestamp: '3 days ago',
    thumbnail: require('../assets/images/thumb-space.jpg'),
    category: 'Science',
    description: 'A breathtaking voyage through the cosmos, from our solar system to the very edge of the observable universe.',
    likes: '142K',
  },
  {
    id: 'v2',
    title: "Tokyo After Dark: 48 Hours in Japan's Neon Capital",
    channel: 'CityPulse', channelId: 'ch2', channelColor: '#3A7BD5', channelInitials: 'CP',
    verified: true, views: '1.8M', duration: '18:32', timestamp: '1 week ago',
    thumbnail: require('../assets/images/thumb-city.jpg'),
    category: 'Travel',
    description: 'From the electric streets of Shibuya to quiet temples, Tokyo at night is unlike anywhere on Earth.',
    likes: '89K',
  },
  {
    id: 'v3',
    title: 'Inside the Machine: How Modern AI Chips Are Built',
    channel: 'TechForward', channelId: 'ch3', channelColor: '#00B4D8', channelInitials: 'TF',
    verified: true, views: '5.4M', duration: '31:17', timestamp: '5 days ago',
    thumbnail: require('../assets/images/thumb-tech.jpg'),
    category: 'Tech',
    description: 'A deep dive into the nanoscale engineering behind the processors powering the next generation of AI.',
    likes: '267K',
  },
  {
    id: 'v4',
    title: "Patagonia Untouched: Trekking the World's Last Wild Places",
    channel: 'WildEarth', channelId: 'ch4', channelColor: '#52B788', channelInitials: 'WE',
    verified: true, views: '920K', duration: '45:09', timestamp: '2 weeks ago',
    thumbnail: require('../assets/images/thumb-nature.jpg'),
    category: 'Travel',
    description: 'Join us on an epic 2-week journey through the untouched wilderness of southern Patagonia.',
    likes: '61K',
  },
  {
    id: 'v5',
    title: 'World Finals Day 3 Highlights: The Greatest Plays Ever Recorded',
    channel: 'PixelArena', channelId: 'ch5', channelColor: '#9B5DE5', channelInitials: 'PA',
    verified: true, views: '12.3M', duration: '14:22', timestamp: '2 days ago',
    thumbnail: require('../assets/images/thumb-gaming.jpg'),
    category: 'Gaming',
    description: 'Relive the most incredible moments from the World Finals, packed with clutch plays and record-breaking performances.',
    likes: '891K',
  },
  {
    id: 'v6',
    title: 'Lo-Fi Cosmos: 3 Hours of Deep Focus Music for Study & Work',
    channel: 'SoundWave', channelId: 'ch6', channelColor: '#F4A261', channelInitials: 'SW',
    verified: false, views: '448K', duration: '3:02:44', timestamp: '4 days ago',
    thumbnail: require('../assets/images/thumb-space.jpg'),
    category: 'Music',
    description: 'Immerse yourself in three hours of lo-fi cosmic beats crafted for deep concentration.',
    likes: '38K',
  },
  {
    id: 'v7',
    title: 'Building a Real-Time Voice Assistant with GPT-5 in 20 Minutes',
    channel: 'TechForward', channelId: 'ch3', channelColor: '#00B4D8', channelInitials: 'TF',
    verified: true, views: '2.2M', duration: '19:55', timestamp: '6 days ago',
    thumbnail: require('../assets/images/thumb-tech.jpg'),
    category: 'Tech',
    description: 'Step-by-step guide to building a voice assistant that responds in real time using the latest GPT-5 API.',
    likes: '113K',
  },
  {
    id: 'v8',
    title: 'Aurora Borealis: Chasing the Northern Lights Across Iceland',
    channel: 'WildEarth', channelId: 'ch4', channelColor: '#52B788', channelInitials: 'WE',
    verified: true, views: '3.7M', duration: '28:14', timestamp: '1 month ago',
    thumbnail: require('../assets/images/thumb-nature.jpg'),
    category: 'Travel',
    description: 'A stunning cinematic journey across Iceland in pursuit of the aurora borealis.',
    likes: '204K',
  },
  {
    id: 'v9',
    title: 'Secrets of the Deep: Ocean Exploration at 10,000 Metres',
    channel: 'Nebula Studios', channelId: 'ch1', channelColor: '#E84A27', channelInitials: 'NS',
    verified: true, views: '1.4M', duration: '37:51', timestamp: '3 weeks ago',
    thumbnail: require('../assets/images/thumb-city.jpg'),
    category: 'Science',
    description: 'Venture into the hadal zone as we explore the deepest trenches of our ocean.',
    likes: '76K',
  },
];

export const CONTINUE_WATCHING = [
  { videoId: 'v3', progress: 0.62 },
  { videoId: 'v1', progress: 0.28 },
  { videoId: 'v5', progress: 0.87 },
];

export const MOCK_DOWNLOADS: DownloadItem[] = [
  {
    videoId: 'v3',
    title: 'Inside the Machine: How Modern AI Chips Are Built',
    channel: 'TechForward', duration: '31:17',
    thumbnail: require('../assets/images/thumb-tech.jpg'),
    status: 'active', progress: 0.54, sizeMB: 487, etaSeconds: 142, speedMbps: 2.4,
  },
  {
    videoId: 'v1',
    title: 'The Observable Universe: A Journey to the Edge',
    channel: 'Nebula Studios', duration: '22:48',
    thumbnail: require('../assets/images/thumb-space.jpg'),
    status: 'queued', progress: 0, sizeMB: 342,
  },
  {
    videoId: 'v5',
    title: 'World Finals Day 3 Highlights',
    channel: 'PixelArena', duration: '14:22',
    thumbnail: require('../assets/images/thumb-gaming.jpg'),
    status: 'completed', progress: 1, sizeMB: 218,
  },
  {
    videoId: 'v4',
    title: 'Patagonia Untouched: Trekking the Last Wild Places',
    channel: 'WildEarth', duration: '45:09',
    thumbnail: require('../assets/images/thumb-nature.jpg'),
    status: 'completed', progress: 1, sizeMB: 612,
  },
];

export const MOCK_PLAYLISTS: Playlist[] = [
  { id: 'p1', name: 'Watch Later', count: 14, isPrivate: false },
  { id: 'p2', name: 'Science Picks', count: 8,  isPrivate: false },
  { id: 'p3', name: 'Night Sessions', count: 23, isPrivate: true },
];

export const MOCK_COMMENTS = [
  { id: 'c1', user: 'StellarMind', initials: 'SM', color: '#3A7BD5', text: "This is one of the best science documentaries I've ever watched. The CGI work is absolutely stunning.", likes: 2341, time: '2h ago' },
  { id: 'c2', user: 'NovaExplorer', initials: 'NE', color: '#52B788', text: 'The part about the Hubble Deep Field really got me. Puts everything into perspective.', likes: 1208, time: '4h ago' },
  { id: 'c3', user: 'CosmicDrifter', initials: 'CD', color: '#9B5DE5', text: 'Watched this at 3am with headphones. Life-changing experience.', likes: 876, time: '6h ago' },
  { id: 'c4', user: 'LightYearLena', initials: 'LL', color: '#F4A261', text: 'Can we get a sequel covering dark matter and dark energy? Pretty please 🙏', likes: 654, time: '8h ago' },
  { id: 'c5', user: 'QuantumQian', initials: 'QQ', color: '#E84A27', text: 'The scale comparisons in the opening sequence are mind-bending. Bravo to the whole team.', likes: 432, time: '1d ago' },
];
