import dotenv from 'dotenv';
import { Scraper, SearchMode } from 'agent-twitter-client';
import schedule from 'node-schedule';
import axios from 'axios';

dotenv.config();

// Gemini 2.0 API ayarları
const GEMINI_API_URL = process.env.GEMINI_API_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface Topic {
  topic: string;
  level: 'temel' | 'orta' | 'ileri' | 'phd';
  description: string;
}

// AI/ML konu dizisi
const aiMlTopics: Topic[] = [
  {
    topic: 'Giriş: Yapay Zeka ve Makine Öğrenmesine Genel Bakış',
    level: 'temel',
    description: 'Yapay zekanın (AI) ve makine öğrenmesinin (ML) temel tanımlarını, amaçlarını ve günlük yaşamda nasıl yer aldıklarını anlat.'
  },
  {
    topic: 'Yapay Zeka Temelleri: Makinelerin Öğrenmeye Başlaması',
    level: 'temel',
    description: 'Bilgisayarların veri ile öğrenme süreçlerine nasıl başladığı, algoritmaların ilk temelleri.'
  },
  {
    topic: 'Makine Öğrenmesi Nedir? Basit Tanımlar ve Örnekler',
    level: 'temel',
    description: 'ML\'nin ne olduğu, örnekler üzerinden basit anlatımı. Verilerden öğrenme ve örüntü tanıma kavramları.'
  },
  {
    topic: 'Yapay Zeka Tarihi: İlk Denemeler ve 1950\'ler',
    level: 'orta',
    description: 'AI\'nin ilk adımları, Turing Testi, erken bilgisayar deneyleri ve temel kavramların oluşumu.'
  },
  {
    topic: 'Makine Öğrenmesinin Tarihi: İstatistiksel Yöntemlerden İlk Başarılar',
    level: 'orta',
    description: 'ML\'nin evrimi; istatistiksel yöntemlerin ve ilk deneysel uygulamaların tarihçesi.'
  },
  {
    topic: 'Derin Öğrenmeye Giriş: Sinir Ağlarının Temelleri',
    level: 'ileri',
    description: 'Yapay sinir ağlarının çalışma prensipleri, temel mimariler ve derin öğrenmenin ortaya çıkışı.'
  },
  {
    topic: 'Modern AI Modelleri: Transformer\'lar ve Yeni Yaklaşımlar',
    level: 'ileri',
    description: 'Günümüzde öne çıkan AI modelleri; özellikle transformer mimarisi ve büyük dil modellerinin çalışma prensipleri.'
  },
  {
    topic: 'Günümüz Uygulamaları: Görü, Ses, Dil ve Daha Fazlası',
    level: 'ileri',
    description: 'Modern AI\'nin pratik uygulamaları: görüntü işleme, ses tanıma, doğal dil işleme gibi alanlardaki örnekler.'
  },
  {
    topic: 'Geleceğe Bakış: AI/ML\'nin Evrimi, Etik ve Gelecek Trendler',
    level: 'phd',
    description: 'AI ve ML\'nin geleceği, olası gelişmeler, etik sorular ve teknolojinin toplumsal etkileri.'
  }
];

let currentTopicIndex = 0;

/**
 * Gemini 2.0 API'yi kullanarak belirlenen konu hakkında tweet içeriği üretir.
 */
async function generateTweetContent(topic: string, level: string, description: string): Promise<string> {
  try {
    const response = await axios.post(GEMINI_API_URL!, {
      prompt: `Lütfen "${topic}" konusu hakkında, "${description}" ifadesini de içeren, ${level} seviye, öğretici ve kronolojik bir tweet oluştur. İçerik, kısa ama bilgi verici olsun.`,
      max_tokens: 150
    }, {
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.text.trim();
  } catch (error) {
    console.error("Gemini API çağrısında hata:", error);
    return `${topic} - ${description}. Detaylar için takipte kalın.`;
  }
}

/**
 * Her 30 dakikada bir AI/ML konu dizisine göre tweet gönderimi yapar.
 */
async function postScheduledTweet(scraper: Scraper): Promise<void> {
  let topicEntry = aiMlTopics[currentTopicIndex];
  if (!topicEntry) {
    currentTopicIndex = 0;
    topicEntry = aiMlTopics[currentTopicIndex];
  }
  console.log(`Tweet hazırlanıyor: ${topicEntry.topic} (${topicEntry.level})`);
  
  const content = await generateTweetContent(topicEntry.topic, topicEntry.level, topicEntry.description);
  const tweetContent = `${content}\n\n#AgentAIMLAgenticAI`;

  try {
    await scraper.sendTweet(tweetContent);
    console.log("Tweet gönderildi:", tweetContent);
  } catch (error) {
    console.error("Tweet gönderme hatası:", error);
  }
  
  currentTopicIndex++;
}

interface Tweet {
  id: string;
  username: string;
}

/**
 * Sosyal medya etkileşim modülü
 */
async function handleSocialInteractions(scraper: Scraper): Promise<void> {
  try {
    const trendingTweets: Tweet[] = await scraper.searchTweets('#AI', 5, SearchMode.Latest) as unknown as Tweet[];
    
    for (const tweet of trendingTweets) {
      try {
        await scraper.likeTweet(tweet.id);
        await scraper.retweet(tweet.id);
        const replyText = `@${tweet.username} AI/ML konusunu derinlemesine öğrenmek isteyenlere öneriler çok yerinde!`;
        await scraper.sendTweet(replyText);
        console.log(`Etkileşim gerçekleştirildi: Tweet ID ${tweet.id}`);
      } catch (interactionError) {
        console.error(`Tweet etkileşim hatası (${tweet.id}):`, interactionError);
      }
    }
  } catch (error) {
    console.error("Trend tweet arama hatası:", error);
  }
}

(async (): Promise<void> => {
  const scraper = new Scraper();
  try {
    await scraper.login(
      process.env.TWITTER_USERNAME!,
      process.env.TWITTER_PASSWORD!,
      process.env.TWITTER_EMAIL!,
      process.env.TWITTER_API_KEY!,
      process.env.TWITTER_API_SECRET_KEY!,
      process.env.TWITTER_ACCESS_TOKEN!,
      process.env.TWITTER_ACCESS_TOKEN_SECRET!
    );
    console.log("Twitter hesabına giriş yapıldı. (Profil: 'Phd. AI Profile')");
  } catch (error) {
    console.error("Twitter giriş hatası:", error);
    process.exit(1);
  }

  // Her 30 dakikada bir AI/ML konu dizisine göre tweet gönderimi yapılır.
  schedule.scheduleJob('*/30 * * * *', async () => {
    await postScheduledTweet(scraper);
  });

  // Her 10 dakikada bir trend tweet'leri analiz edip etkileşim sağlanır.
  schedule.scheduleJob('*/10 * * * *', async () => {
    await handleSocialInteractions(scraper);
  });

  console.log("Agent çalışmaya başladı. Otomatik tweet ve etkileşim modülleri aktif.");
})(); 