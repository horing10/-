/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentInfo } from '../types';

export const koreanInstruments: InstrumentInfo[] = [
  {
    id: 'gayageum',
    name: '가야금',
    hanja: '伽倻琴',
    category: 'string',
    categoryLabel: '현악기 (String)',
    description: '오동나무 울림통에 명주실로 꼰 12줄을 걸어 손가락으로 뜯거나 퉁겨서 소리 내는 한국 전통 발현악기입니다.',
    soundStyle: 'pluck',
    historicalFact: '삼국사기에 따르면 가야국의 가실왕이 당나라의 악기를 본떠 만들었으며, 가야국이 망한 후 우륵이 신라 진흥왕에게 바쳐 널리 전파되었다고 전해집니다.',
    scaleNotes: [
      { name: '황종 (Hwang)', frequency: 311.13, englishName: 'Eb4' },
      { name: '태주 (Tae)', frequency: 349.23, englishName: 'F4' },
      { name: '중려 (Jung)', frequency: 415.30, englishName: 'Ab4' },
      { name: '임종 (Im)', frequency: 466.16, englishName: 'Bb4' },
      { name: '남려 (Nam)', frequency: 523.25, englishName: 'C5' },
      { name: '청황종 (Cheong-Hwang)', frequency: 622.25, englishName: 'Eb5' }
    ]
  },
  {
    id: 'geomungo',
    name: '거문고',
    hanja: '玄琴',
    category: 'string',
    categoryLabel: '현악기 (String)',
    description: '오동나무와 밤나무를 붙여 만든 통 위에 6줄을 얹고, 작은 대나무 막대인 \'술대\'를 오른손에 쥐고 현을 뜯거나 힘차게 내리쳐 소리를 냅니다.',
    soundStyle: 'vibrate',
    historicalFact: '고구려의 재상 왕산악이 중국 진나라에서 보낸 칠현금을 개조하고 이를 위해 새로운 곡들을 작곡하여 탄주하자 검은 학들이 회담하듯 모여들었다 하여 \'현학금(玄鶴琴)\'이라 불리다 거문고가 되었습니다.',
    scaleNotes: [
      { name: '탁황종 (Tak-Hwang)', frequency: 155.56, englishName: 'Eb3' },
      { name: '탁태주 (Tak-Tae)', frequency: 174.61, englishName: 'F3' },
      { name: '탁중려 (Tak-Jung)', frequency: 207.65, englishName: 'Ab3' },
      { name: '탁임종 (Tak-Im)', frequency: 233.08, englishName: 'Bb3' },
      { name: '탁남려 (Tak-Nam)', frequency: 261.63, englishName: 'C4' },
      { name: '황종 (Hwang)', frequency: 311.13, englishName: 'Eb4' }
    ]
  },
  {
    id: 'daegeum',
    name: '대금',
    hanja: '大琴',
    category: 'wind',
    categoryLabel: '관악기 (Wind)',
    description: '오래된 대나무로 만든 한국 가로피리로, 맑으면서도 매우 풍부하고 독특한 갈대막 떨림(청공 소리)을 발산하는 대표적인 향악기입니다.',
    soundStyle: 'wind',
    historicalFact: '신라 신문왕 대에 동해의 신비한 대나무로 피리를 만들어 불었더니 나라의 만 가지 병과 근심이 가라앉고 군사가 퇴각하며 바람과 파도가 잠잠해져 나라의 보물인 \'만파식적(萬波息笛)\'이라고 명명했다고 전합니다.',
    scaleNotes: [
      { name: '황종 (Hwang)', frequency: 311.13, englishName: 'Eb4' },
      { name: '태주 (Tae)', frequency: 349.23, englishName: 'F4' },
      { name: '중려 (Jung)', frequency: 415.30, englishName: 'Ab4' },
      { name: '임종 (Im)', frequency: 466.16, englishName: 'Bb4' },
      { name: '남려 (Nam)', frequency: 523.25, englishName: 'C5' },
      { name: '청황종 (Cheong-Hwang)', frequency: 622.25, englishName: 'Eb5' }
    ],
    vibrationMembrane: true
  },
  {
    id: 'haegeum',
    name: '해금',
    hanja: '奚琴',
    category: 'string',
    categoryLabel: '현악기 (String)',
    description: '두 줄짜리 활현악기형 악기로, 활을 두 줄 사이에 끼워 마찰시켜 독특하고 서정적이며 가냘픈 코맹맹이 같은 찰현 울림을 만듭니다.',
    soundStyle: 'bend',
    historicalFact: '고려 시대 송나라로부터 수입되는 여진족의 전통 악기였으나 조선 시대를 거쳐 아쟁과 함께 향악화되었고 오늘날에는 국악뿐 아니라 대중음악 오케스트라에서도 서정적인 표현력이 강해 널리 쓰입니다.',
    scaleNotes: [
      { name: '황종 (Hwang)', frequency: 311.13, englishName: 'Eb4' },
      { name: '태주 (Tae)', frequency: 349.23, englishName: 'F4' },
      { name: '중려 (Jung)', frequency: 415.30, englishName: 'Ab4' },
      { name: '임종 (Im)', frequency: 466.16, englishName: 'Bb4' },
      { name: '남려 (Nam)', frequency: 523.25, englishName: 'C5' },
      { name: '청황종 (Cheong-Hwang)', frequency: 622.25, englishName: 'Eb5' }
    ]
  },
  {
    id: 'piri',
    name: '피리',
    hanja: '觱篥',
    category: 'wind',
    categoryLabel: '관악기 (Wind)',
    description: '작은 대나무 대에 큰 겹서(리드)를 꽂아 입에 물고 강하게 숨을 불어넣어 국악 관악 합주에서 부드럽고 주도적인 높은 성량을 선사하는 정악 관악기입니다.',
    soundStyle: 'wind',
    historicalFact: '세로로 부는 소형 관악기이지만 겹리드 악기 특유의 압도적인 음량으로 주위 모든 고음량 악기들을 이끌며, 영산회상이나 궁중 제례악에서 항상 가락의 중심 뼈대를 불어내는 중추적 역할을 맡습니다.',
    scaleNotes: [
      { name: '황종 (Hwang)', frequency: 311.13, englishName: 'Eb4' },
      { name: '태주 (Tae)', frequency: 349.23, englishName: 'F4' },
      { name: '중려 (Jung)', frequency: 415.30, englishName: 'Ab4' },
      { name: '임종 (Im)', frequency: 466.16, englishName: 'Bb4' },
      { name: '남려 (Nam)', frequency: 523.25, englishName: 'C5' },
      { name: '청황종 (Cheong-Hwang)', frequency: 622.25, englishName: 'Eb5' }
    ]
  },
  {
    id: 'janggu',
    name: '장구',
    hanja: '杖鼓',
    category: 'percussion',
    categoryLabel: '타악기 (Percussion)',
    description: '모래시계 모양의 통 양면에 동물의 가죽을 대어 묶은 악기입니다. 왼손으로는 두터운 북소리(쿵), 오른손으로는 날카로운 채소리(딱)를 내며 국악 장단 반주의 중추입니다심.',
    soundStyle: 'strike_low',
    historicalFact: '고려 시대 宋나라에서 유입되었으며 궁중 음악, 무용, 민속 악기, 농악을 통틀어 한반도의 거의 모든 곡에 무조건 동반되어 장단 속도의 뼈대와 흔들림을 주도하는 심장과 같은 국악의 대변자입니다.',
    scaleNotes: [
      { name: '쿵 (Kung - Low)', frequency: 110.00, englishName: 'A2' },
      { name: '딱 (Tak - High Tap)', frequency: 330.00, englishName: 'E4' },
      { name: '더러러러 (Roll)', frequency: 220.00, englishName: 'A3' }
    ]
  },
  {
    id: 'kkwaenggwari',
    name: '괭과리',
    hanja: '괭과리',
    category: 'percussion',
    categoryLabel: '타악기 (Percussion)',
    description: '놋쇠로 만든 원반 모양의 소형 치악기로, 나무 망치인 깽마채로 내리쳐 귀를 찌르는 카리스마 넘치는 고주파 금속음을 발산합니다.',
    soundStyle: 'strike_high',
    historicalFact: '사물놀이와 매구, 농악 판굿에서 지휘자 역할을 수행하며 괭과리 연주자를 상쇠(상쇠)라고 불러 전체 춤사위와 음악 흐름의 대열을 직접 선도합니다.',
    scaleNotes: [
      { name: '깽 (Ggaeng - Strike)', frequency: 987.77, englishName: 'B5' },
      { name: '개 (Gae - Muted)', frequency: 1109.73, englishName: 'C#6' },
      { name: '지 (Ji - Soft Trem)', frequency: 880.00, englishName: 'A5' }
    ]
  },
  {
    id: 'jing',
    name: '징',
    hanja: '鉦',
    category: 'percussion',
    categoryLabel: '타악기 (Percussion)',
    description: '큰 놋쇠 대야 양쪽을 끈으로 묶어 들거나 틀에 걸은 뒤, 부드러운 뭉치로 쳐 장엄하고 웅장하며 한없이 은은하고 길게 번지는 잔향을 만듭니다.',
    soundStyle: 'strike_metal',
    historicalFact: '지구상의 수많은 금속 타악기 중에서도 징은 그 여운과 맥박이 지구 대기처럼 부드럽고 길어서, 농악에서는 첫 박에 웅장한 울림으로 땅과 우주를 진동시키며 판소리나 사찰 염불에서도 마음을 모으는 역할을 합니다.',
    scaleNotes: [
      { name: '지잉 (Jing Resonance)', frequency: 130.81, englishName: 'C3' },
      { name: '동 (Dong Center Resonance)', frequency: 116.54, englishName: 'A#2' }
    ]
  }
];
