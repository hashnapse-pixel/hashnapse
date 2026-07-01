import { supabase } from '../lib/supabase';

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  votes: number;              // 누적 득표수
  voteChangeRate: number;     // 득표 증가율 (%)
  voteHistory: number[];      // 득표수 차트 렌더링용 최근 기록 (8개)
  roomId?: string;            // 방(Room) ID 필드 추가
  genre?: string;             // 장르 추가
  group?: string;             // 그룹 추가
}

export interface UserAsset {
  availableVotes: number;      // 사용 가능한 투표권 (팬심)
  pendingVotes: number;        // 당일 트윗 언급으로 획득했으나 아직 23:00 집계 전인 투표권
  scheduledVotes: number;      // 23:00에 집계되어 익일 00:00에 지급되기 위해 대기 중인 투표권
}

export interface UserVote {
  characterId: string;
  votedQuantity: number; // 스타에게 투표 완료한 표수
  roomId?: string;       // 투표가 진행된 방 ID 추가
}

export interface Room {
  id: string;
  name: string;
  creator: string;
  createdAt: number;
}

export interface RoomMember {
  roomId: string;
  userEmail: string;
  nickname: string;
  joinedAt: number;
}

export interface CalorieRecord {
  id: string;
  userEmail: string;
  date: string;
  calories: number;
  photoUrl: string; // 첨부된 사진 파일(base64 또는 URL)
}

export interface KickVote {
  roomId: string;
  targetEmail: string;
  votedEmails: string[]; // 찬성한 이메일 목록
}

// Initial Fallback Data
const INITIAL_CHARACTERS: Character[] = [
  {
    id: 'char-1',
    name: '스파클링토끼',
    description: '우주에서 가장 발이 빠른 토끼. 발랄한 에너지로 차트를 지배합니다.',
    imageUrl: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=200&auto=format&fit=crop&q=60',
    votes: 350,
    voteChangeRate: 15.4,
    voteHistory: [300, 310, 315, 320, 330, 340, 345, 350],
    genre: '애니메이션',
    group: 'SPARK'
  },
  {
    id: 'char-2',
    name: '아이언판다',
    description: '대나무 실드로 어떤 순위 하락도 방어해내는 든든한 판다.',
    imageUrl: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=200&auto=format&fit=crop&q=60',
    votes: 820,
    voteChangeRate: 110.2,
    voteHistory: [390, 450, 520, 600, 680, 720, 790, 820],
    genre: '애니메이션',
    group: 'PANDA'
  },
  {
    id: 'char-3',
    name: '골든독',
    description: '황금빛 털을 가진 행운의 강아지. 밈 투표의 대부.',
    imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&auto=format&fit=crop&q=60',
    votes: 540,
    voteChangeRate: 45.9,
    voteHistory: [370, 390, 420, 450, 480, 500, 520, 540],
    genre: '밈',
    group: 'GOLDD'
  },
  {
    id: 'char-4',
    name: '아서 펜드래건',
    description: '인기 판타지 웹소설 [회귀한 성기사의 몰락]의 주인공. 헌신적인 카리스마로 독자들의 팬심 순매수 급상승 중.',
    imageUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=200&auto=format&fit=crop&q=60',
    votes: 1200,
    voteChangeRate: 85.2,
    voteHistory: [800, 850, 920, 980, 1050, 1100, 1150, 1200],
    genre: '웹소설',
    group: 'ARTHUR'
  },
  {
    id: 'char-5',
    name: '하루',
    description: '학원 로맨스 웹툰 [너와 나의 거리]의 츤데레 서브 남주. 최근 고백 씬 방출 후 독자들의 몰표 폭발.',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=200&auto=format&fit=crop&q=60',
    votes: 950,
    voteChangeRate: -12.4,
    voteHistory: [1050, 1080, 1100, 1080, 1020, 980, 960, 950],
    genre: '웹툰',
    group: 'HARU'
  },
  {
    id: 'char-6',
    name: '카엘리아',
    description: '서브컬처 수집형 게임 [프로젝트 오라클]의 0티어 광속성 마법사. 역대급 일러스트와 서사로 유저들의 압도적 지지.',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop&q=60',
    votes: 1540,
    voteChangeRate: 154.2,
    voteHistory: [600, 750, 900, 1100, 1250, 1380, 1460, 1540],
    genre: '게임',
    group: 'KAEL'
  },
  {
    id: 'char-7',
    name: '리아',
    description: '인기 버추얼 라이브 방송인. 매일 저녁 소통 방송과 게임 스트리밍으로 압도적인 팬덤 화력 자랑 중.',
    imageUrl: 'https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=200&auto=format&fit=crop&q=60',
    votes: 1720,
    voteChangeRate: 25.8,
    voteHistory: [1200, 1350, 1420, 1480, 1520, 1600, 1650, 1720],
    genre: '버추얼',
    group: 'LIA'
  }
];

const INITIAL_ASSETS: UserAsset = {
  availableVotes: 5,
  pendingVotes: 0,
  scheduledVotes: 0
};

const getLocal = <T>(key: string, defaultValue: T): T => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultValue;
};

const setLocal = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const dataService = {
  // 현재 로그인된 사용자의 이메일 주소 가져오기 (Supabase Auth 연계)
  async getCurrentUserEmail(): Promise<string | null> {
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          if (session.user.email) {
            return session.user.email;
          } else {
            // 이메일 정보가 누락된 소셜 로그인(예: 카카오 닉네임만 제공 등)의 경우 고유 ID 기반 가상 이메일 생성
            const provider = session.user.app_metadata.provider || 'social';
            return `${provider}_${session.user.id.substring(0, 8)}@hashnapse.com`;
          }
        }
      } catch (err) {
        console.error('Error fetching Supabase session:', err);
      }
    }
    // LocalStorage fallback (오프라인 모드용)
    return localStorage.getItem('user_email');
  },

  // Supabase Auth Kakao 소셜 로그인 처리
  async loginWithKakao(): Promise<void> {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        throw new Error(`카카오 로그인 연동 오류: ${error.message}`);
      }
    } else {
      // Supabase 미연동 시 가상 카카오 로그인 시뮬레이션
      const mockEmail = 'kakao_avatar@kakao.com';
      localStorage.setItem('user_email', mockEmail);
      await this.syncWithSupabase();
    }
  },

  // Supabase Auth X (Twitter) 소셜 로그인 처리
  async loginWithX(): Promise<void> {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'x',
        options: {
          redirectTo: window.location.origin,
          scopes: 'users.read tweet.read offline.access'
        }
      });
      if (error) {
        throw new Error(`X 로그인 연동 오류: ${error.message}`);
      }
    } else {
      // Supabase 미연동 시 가상 X 로그인 시뮬레이션
      const mockEmail = 'x_avatar@x.com';
      localStorage.setItem('user_email', mockEmail);
      localStorage.setItem('x_connected', 'true');
      localStorage.setItem('x_handle', '@xavatar');
      await this.syncWithSupabase();
    }
  },

  // Supabase Auth 로그인 & 자동 회원가입 처리
  async loginWithSupabase(email: string, password: string): Promise<string> {
    const cleanEmail = email.trim().replace(/\s/g, '').toLowerCase();
    
    if (supabase) {
      // 1. 기존 가입된 계정으로 로그인 시도
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      // 2. 계정이 없어서 로그인 실패한 경우, 자동으로 신규 회원가입 처리
      if (signInError && (signInError.message.includes('Invalid login credentials') || signInError.message.includes('not found'))) {
        console.log('Account not found. Signing up new user...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password
        });

        if (signUpError) {
          throw new Error(`회원가입 실패: ${signUpError.message}`);
        }

        // 가입 완료된 이메일 반환 (가입 즉시 로그인 세션 수립됨)
        if (signUpData.user && signUpData.user.email) {
          localStorage.setItem('user_email', signUpData.user.email);
          await this.syncWithSupabase();
          return signUpData.user.email;
        }
      } else if (signInError) {
        throw new Error(`로그인 실패: ${signInError.message}`);
      }

      if (signInData.user && signInData.user.email) {
        localStorage.setItem('user_email', signInData.user.email);
        await this.syncWithSupabase();
        return signInData.user.email;
      }
    }

    // Supabase 미연동 시 로컬 모드로 작동
    localStorage.setItem('user_email', cleanEmail);
    await this.syncWithSupabase();
    return cleanEmail;
  },

  // 로그아웃
  async logout(): Promise<void> {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase auth signout error:', err);
      }
    }
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_assets');
    localStorage.removeItem('user_votes_list');
  },

  // Supabase Auth 세션 변경 감지 리스너 추가
  onAuthChange(callback: (email: string | null) => void) {
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed event:', event);
        if (session && session.user) {
          let email = session.user.email;
          if (!email) {
            const provider = session.user.app_metadata.provider || 'social';
            email = `${provider}_${session.user.id.substring(0, 8)}@hashnapse.com`;
          }
          localStorage.setItem('user_email', email);
          
          // X 계정 자동 연동 적용
          const username = email.split('@')[0];
          const cleanName = username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const autoXHandle = `@${cleanName || 'user'}`;
          localStorage.setItem('x_connected', 'true');
          localStorage.setItem('x_handle', autoXHandle);

          await this.syncWithSupabase();
          callback(email);
        } else {
          localStorage.removeItem('user_email');
          localStorage.removeItem('x_connected');
          localStorage.removeItem('x_handle');
          callback(null);
        }
      });
      return () => subscription.unsubscribe();
    }
    return () => {};
  },

  // Supabase ➡️ 로컬 스토리지 데이터 동기화
  async syncWithSupabase(roomId: string = 'global'): Promise<boolean> {
    const email = await this.getCurrentUserEmail();
    if (!email) return false;
    
    if (supabase) {
      try {
        // 3개의 요청을 병렬로 동시에 호출하여 지연시간 단축 (방 ID 기준으로 필터링)
        const [charsRes, assetRes, votesRes] = await Promise.all([
          supabase.from('characters').select('*').eq('room_id', roomId),
          supabase.from('user_assets').select('*').eq('id', email).eq('room_id', roomId).maybeSingle(),
          supabase.from('user_votes').select('*').eq('user_id', email).eq('room_id', roomId)
        ]);

        const { data: chars, error: err1 } = charsRes;
        const { data: asset, error: err2 } = assetRes;
        const { data: votes, error: err3 } = votesRes;

        // 1. 캐릭터 리스트 동기화
        if (!err1 && chars) {
          const mappedChars: Character[] = chars.map(c => {
            const votesVal = c.votes || 0;
            const history = c.vote_history || [votesVal];
            const baseVotes = history[0] || 1;
            const rate = Number(((votesVal - baseVotes) / baseVotes * 100).toFixed(1));
            
            return {
              id: c.id,
              name: c.name,
              description: c.description,
              imageUrl: c.image_url,
              votes: votesVal,
              voteChangeRate: isNaN(rate) ? 0 : rate,
              voteHistory: history,
              genre: c.genre,
              group: c.group,
              roomId: c.room_id
            };
          });
          setLocal(`characters_list_${roomId}`, mappedChars);
        }

        // 2. 이메일+방 기준 자산 동기화
        if (!err2 && asset) {
          const mappedAsset: UserAsset = {
            availableVotes: asset.available_votes || 0,
            pendingVotes: asset.pending_votes || 0,
            scheduledVotes: asset.scheduled_votes || 0
          };
          setLocal(`user_assets_${roomId}`, mappedAsset);
        } else if (!err2 && !asset) {
          await supabase.from('user_assets').insert([
            {
              id: email,
              room_id: roomId,
              available_votes: INITIAL_ASSETS.availableVotes
            }
          ]);
          setLocal(`user_assets_${roomId}`, INITIAL_ASSETS);
        }

        // 3. 이메일+방 기준 내 투표 내역 동기화
        if (!err3 && votes) {
          const mappedVotes: UserVote[] = votes.map(v => ({
            characterId: v.character_id,
            votedQuantity: v.voted_quantity || 0,
            roomId: v.room_id
          }));
          setLocal(`user_votes_list_${roomId}`, mappedVotes);
        }
        
        console.log(`Supabase parallel sync completed for user: ${email} in room: ${roomId}`);
        return true;
      } catch (err) {
        console.error('Supabase sync err:', err);
        return false;
      }
    }
    return false;
  },

  // 1. 캐릭터 리스트 가져오기 (방별 격리)
  async getCharacters(roomId: string = 'global'): Promise<Character[]> {
    return getLocal<Character[]>(`characters_list_${roomId}`, roomId === 'global' ? INITIAL_CHARACTERS : []);
  },

  // 2. 캐릭터 등록하기 (해당 방에 상장, 상장 수수료 10 P 차감)
  async registerCharacter(roomId: string = 'global', name: string, description: string, imageUrl: string, genre: string, group: string): Promise<Character> {
    const cleanName = name.replace(/\s/g, '');
    
    if (cleanName.length > 10) {
      throw new Error('캐릭터 이름은 최대 10글자까지만 가능합니다.');
    }
    if (cleanName.length === 0) {
      throw new Error('캐릭터 이름을 입력해주세요.');
    }

    const currentList = getLocal<Character[]>(`characters_list_${roomId}`, roomId === 'global' ? INITIAL_CHARACTERS : []);
    const isDuplicate = currentList.some(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      throw new Error('이미 등록된 캐릭터 이름입니다.');
    }

    const assets = await this.getUserAsset(roomId);
    if (assets.availableVotes < 1000) {
      throw new Error(`상장 수수료(1,000 P)가 부족하여 상장할 수 없습니다. (보유: ${assets.availableVotes} P)`);
    }

    assets.availableVotes -= 1000;
    await this.saveUserAsset(roomId, assets);

    const newChar: Character = {
      id: `char-${Date.now()}`,
      name: cleanName,
      description: description || '새롭게 등록된 캐릭터입니다.',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1535268647977-a403b69fc756?w=200&auto=format&fit=crop&q=60',
      votes: 10,
      voteChangeRate: 0,
      voteHistory: [10],
      roomId: roomId,
      genre: genre || '기타',
      group: group || '개인'
    };

    setLocal(`characters_list_${roomId}`, [...currentList, newChar]);

    if (supabase) {
      try {
        await supabase.from('characters').insert([
          {
            id: newChar.id,
            name: newChar.name,
            description: newChar.description,
            image_url: newChar.imageUrl,
            votes: newChar.votes,
            vote_change_rate: newChar.voteChangeRate,
            vote_history: newChar.voteHistory,
            room_id: roomId,
            genre: newChar.genre,
            group: newChar.group
          }
        ]);
      } catch (err) {
        console.error('Supabase write characters err:', err);
      }
    }

    return newChar;
  },

  // 3. 사용자 자산 정보 가져오기 (방별 격리)
  async getUserAsset(roomId: string = 'global'): Promise<UserAsset> {
    const rawAsset = getLocal<UserAsset>(`user_assets_${roomId}`, INITIAL_ASSETS);
    return this.syncAssetRewards(roomId, rawAsset);
  },

  // 3-1. 자산 보상 동기화 (방별 격리)
  async syncAssetRewards(roomId: string = 'global', assets: UserAsset): Promise<UserAsset> {
    const now = new Date();
    const lastSyncStr = getLocal<string>(`last_reward_sync_time_${roomId}`, '');
    
    if (!lastSyncStr) {
      setLocal(`last_reward_sync_time_${roomId}`, now.toISOString());
      return assets;
    }
    
    const lastSync = new Date(lastSyncStr);
    setLocal(`last_reward_sync_time_${roomId}`, now.toISOString());

    const lastSyncReset = new Date(lastSync.getFullYear(), lastSync.getMonth(), lastSync.getDate(), 23, 0, 0, 0);
    if (lastSync.getTime() < lastSyncReset.getTime() && now.getTime() >= lastSyncReset.getTime()) {
      assets.scheduledVotes = (assets.scheduledVotes || 0) + (assets.pendingVotes || 0);
      assets.pendingVotes = 0;
    }

    if (lastSync.getDate() !== now.getDate() || lastSync.getMonth() !== now.getMonth() || lastSync.getFullYear() !== now.getFullYear()) {
      assets.availableVotes = (assets.availableVotes || 0) + (assets.scheduledVotes || 0);
      assets.scheduledVotes = 0;
    }

    await this.saveUserAsset(roomId, assets);
    return assets;
  },

  // 테스트용 시각 강제 이동 및 수동 보상 동기화 시뮬레이션 (방별 격리)
  async simulateTimeJump(roomId: string = 'global', hours: number): Promise<UserAsset> {
    const assets = getLocal<UserAsset>(`user_assets_${roomId}`, INITIAL_ASSETS);
    
    const now = new Date();
    const fakeLastSync = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    setLocal(`last_reward_sync_time_${roomId}`, fakeLastSync.toISOString());
    
    return this.syncAssetRewards(roomId, assets);
  },

  // 4. 자산 상태 저장하기 (방별 격리)
  async saveUserAsset(roomId: string = 'global', asset: UserAsset): Promise<void> {
    const email = await this.getCurrentUserEmail();
    setLocal(`user_assets_${roomId}`, asset);
    if (supabase && email) {
      try {
        await supabase.from('user_assets').upsert({
          id: email,
          room_id: roomId,
          available_votes: asset.availableVotes || 0,
          pending_votes: asset.pendingVotes || 0,
          scheduled_votes: asset.scheduledVotes || 0
        });
      } catch (err) {
        console.error('Supabase write assets err:', err);
      }
    }
  },

  // 5. 사용자가 행사한 투표 목록 가져오기 (방별 격리)
  async getUserVotes(roomId: string = 'global'): Promise<UserVote[]> {
    return getLocal<UserVote[]>(`user_votes_list_${roomId}`, []);
  },

  // 6. 스타 투표하기 (방별 격리)
  async voteStock(roomId: string = 'global', characterId: string, quantity: number): Promise<{ success: boolean; message: string }> {
    const email = await this.getCurrentUserEmail();
    if (!email) return { success: false, message: '로그인이 필요합니다.' };

    const assets = await this.getUserAsset(roomId);
    if (assets.availableVotes < quantity) {
      return { success: false, message: `보유한 미사용 포인트가 부족합니다. (남은 포인트: ${assets.availableVotes} P)` };
    }

    assets.availableVotes -= quantity;

    const votes = getLocal<UserVote[]>(`user_votes_list_${roomId}`, []);
    const voteIndex = votes.findIndex(v => v.characterId === characterId);
    
    if (voteIndex >= 0) {
      votes[voteIndex].votedQuantity += quantity;
    } else {
      votes.push({
        characterId,
        votedQuantity: quantity,
        roomId: roomId
      });
    }

    setLocal(`user_votes_list_${roomId}`, votes);
    await this.saveUserAsset(roomId, assets);

    const characters = getLocal<Character[]>(`characters_list_${roomId}`, roomId === 'global' ? INITIAL_CHARACTERS : []);
    const charIndex = characters.findIndex(c => c.id === characterId);
    if (charIndex >= 0) {
      const char = characters[charIndex];
      char.votes = (char.votes || 0) + quantity;
      
      const history = char.voteHistory || [char.votes];
      const baseVotes = history[0] || 1;
      const rate = Number(((char.votes - baseVotes) / baseVotes * 100).toFixed(1));
      
      char.voteChangeRate = isNaN(rate) ? 0 : rate;
      char.voteHistory = [
        ...history.slice(-7),
        char.votes
      ];
      setLocal(`characters_list_${roomId}`, characters);
    }

    if (supabase) {
      try {
        const voteToUpsert = votes.find(v => v.characterId === characterId);
        if (voteToUpsert) {
          await supabase.from('user_votes').upsert({
            user_id: email,
            character_id: characterId,
            voted_quantity: voteToUpsert.votedQuantity,
            room_id: roomId
          });
        }
        
        if (charIndex >= 0) {
          const char = characters[charIndex];
          await supabase.from('characters').upsert({
            id: char.id,
            name: char.name,
            description: char.description,
            image_url: char.imageUrl,
            votes: char.votes,
            vote_change_rate: char.voteChangeRate,
            vote_history: char.voteHistory,
            room_id: roomId
          });
        }
      } catch (err) {
        console.error('Supabase write vote err:', err);
      }
    }

    return { success: true, message: `${selectedCharacterName(characters, characterId)}에게 ${quantity} 포인트를 보냈습니다!` };
  },

  // 7. 투표 철회 (방별 격리)
  async unvoteStock(roomId: string = 'global', characterId: string, quantity: number): Promise<{ success: boolean; message: string }> {
    const email = await this.getCurrentUserEmail();
    if (!email) return { success: false, message: '로그인이 필요합니다.' };

    const votes = getLocal<UserVote[]>(`user_votes_list_${roomId}`, []);
    const voteIndex = votes.findIndex(v => v.characterId === characterId);
    if (voteIndex < 0) return { success: false, message: '보낸 포인트 이력이 없습니다.' };

    const vote = votes[voteIndex];
    if (vote.votedQuantity < quantity) {
      return { success: false, message: `회수할 포인트 수량이 부족합니다. (보낸 포인트: ${vote.votedQuantity} P)` };
    }

    const assets = await this.getUserAsset(roomId);
    assets.availableVotes += quantity;
    vote.votedQuantity -= quantity;

    if (vote.votedQuantity === 0) {
      votes.splice(voteIndex, 1);
    } else {
      votes[voteIndex] = vote;
    }

    setLocal(`user_votes_list_${roomId}`, votes);
    await this.saveUserAsset(roomId, assets);

    const characters = getLocal<Character[]>(`characters_list_${roomId}`, roomId === 'global' ? INITIAL_CHARACTERS : []);
    const charIndex = characters.findIndex(c => c.id === characterId);
    if (charIndex >= 0) {
      const char = characters[charIndex];
      char.votes = Math.max(0, (char.votes || 0) - quantity);
      
      const history = char.voteHistory || [char.votes];
      const baseVotes = history[0] || 1;
      const rate = Number(((char.votes - baseVotes) / baseVotes * 100).toFixed(1));
      
      char.voteChangeRate = isNaN(rate) ? 0 : rate;
      char.voteHistory = [
        ...history.slice(-7),
        char.votes
      ];
      setLocal(`characters_list_${roomId}`, characters);
    }

    if (supabase) {
      try {
        if (vote.votedQuantity === 0) {
          await supabase.from('user_votes').delete().eq('user_id', email).eq('character_id', characterId).eq('room_id', roomId);
        } else {
          await supabase.from('user_votes').upsert({
            user_id: email,
            character_id: characterId,
            voted_quantity: vote.votedQuantity,
            room_id: roomId
          });
        }
        
        if (charIndex >= 0) {
          const char = characters[charIndex];
          await supabase.from('characters').upsert({
            id: char.id,
            name: char.name,
            description: char.description,
            image_url: char.imageUrl,
            votes: char.votes,
            vote_change_rate: char.voteChangeRate,
            vote_history: char.voteHistory,
            room_id: roomId
          });
        }
      } catch (err) {
        console.error('Supabase write unvote err:', err);
      }
    }

    return { success: true, message: `${selectedCharacterName(characters, characterId)}에게 보낸 포인트 ${quantity} P를 회수하였습니다.` };
  },

  // 8. 실시간 가상 대중 투표 유입 시뮬레이터 (방별 격리)
  async updateMarketPrices(roomId: string = 'global'): Promise<Character[]> {
    const characters = getLocal<Character[]>(`characters_list_${roomId}`, roomId === 'global' ? INITIAL_CHARACTERS : []);
    if (characters.length === 0) return [];
    
    const updated = characters.map(char => {
      const addVotes = Math.floor(Math.random() * 15) + 1;
      const votes = (char.votes || 0) + addVotes;
      
      const history = char.voteHistory && char.voteHistory.length > 0 ? char.voteHistory : [votes];
      const baseVotes = history[0] || 1;
      
      const rate = Number(((votes - baseVotes) / baseVotes * 100).toFixed(1));
      const changeRate = isNaN(rate) ? 0 : rate;
      const newHistory = [...history.slice(-7), votes];

      return {
        ...char,
        votes: votes,
        voteChangeRate: changeRate,
        voteHistory: newHistory,
        roomId: roomId
      };
    });

    setLocal(`characters_list_${roomId}`, updated);

    if (supabase) {
      try {
        for (const char of updated) {
          await supabase.from('characters').upsert({
            id: char.id,
            name: char.name,
            description: char.description,
            image_url: char.imageUrl,
            votes: char.votes,
            vote_change_rate: char.voteChangeRate,
            vote_history: char.voteHistory,
            room_id: roomId
          });
        }
      } catch (err) {
        console.error('Supabase write updateMarketPrices fail:', err);
      }
    }

    return updated;
  },

  // ==================== [ 방(Room) 관리 기능 ] ====================

  // 1. 방 만들기 (UUID 기반 방 생성)
  async createRoom(name: string): Promise<Room> {
    const email = await this.getCurrentUserEmail();
    if (!email) throw new Error('로그인이 필요한 기능입니다.');

    const cleanName = name.trim();
    if (!cleanName) throw new Error('방 이름을 입력해주세요.');

    const rooms = getLocal<Room[]>('rooms_list', []);
    const myCreatedRooms = rooms.filter(r => r.id !== 'global' && r.creator === email);
    if (myCreatedRooms.length >= 3) {
      throw new Error('스페이스는 최대 3개까지만 생성(개설)할 수 있습니다.');
    }

    const newRoom: Room = {
      id: `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: cleanName,
      creator: email,
      createdAt: Date.now()
    };

    setLocal('rooms_list', [...rooms, newRoom]);

    // 방 생성자 자동 참여
    await this.joinRoom(newRoom.id);

    if (supabase) {
      try {
        await supabase.from('rooms').insert([
          { id: newRoom.id, name: newRoom.name, creator: newRoom.creator }
        ]);
      } catch (err) {
        console.error('Supabase write room err:', err);
      }
    }

    return newRoom;
  },

  // 2. 방 참여하기 (초대 링크 등으로 가입)
  async joinRoom(roomId: string): Promise<Room> {
    const email = await this.getCurrentUserEmail();
    if (!email) throw new Error('로그인이 필요한 기능입니다.');

    const rooms = getLocal<Room[]>('rooms_list', []);
    const targetRoom = rooms.find(r => r.id === roomId);

    // Supabase 연동 시 방 존재 유무 추가 확인
    let foundRoom = targetRoom;
    if (!foundRoom && supabase) {
      try {
        const { data } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
        if (data) {
          foundRoom = {
            id: data.id,
            name: data.name,
            creator: data.creator,
            createdAt: Date.now()
          };
          setLocal('rooms_list', [...rooms, foundRoom]);
        }
      } catch (err) {
        console.error('Supabase check room err:', err);
      }
    }

    if (!foundRoom) {
      // 로컬에조차 없으면 기본 데모용 방 생성 (초대 링크 테스트용)
      foundRoom = {
        id: roomId,
        name: '초대된 캐릭터 방',
        creator: 'system@hashnapse.com',
        createdAt: Date.now()
      };
      setLocal('rooms_list', [...rooms, foundRoom]);
    }

    const members = getLocal<RoomMember[]>('room_members_list', []);
    const isAlreadyMember = members.some(m => m.roomId === roomId && m.userEmail === email);

    if (!isAlreadyMember && roomId !== 'global') {
      const myJoinedPrivateRoomIds = members.filter(m => m.userEmail === email && m.roomId !== 'global');
      if (myJoinedPrivateRoomIds.length >= 5) {
        throw new Error('비공개 스페이스는 최대 5개까지만 참여(가입)할 수 있습니다.');
      }
    }

    if (!isAlreadyMember) {
      const userNick = await this.getUserNickname();
      const newMember: RoomMember = {
        roomId,
        userEmail: email,
        nickname: userNick,
        joinedAt: Date.now()
      };
      setLocal('room_members_list', [...members, newMember]);

      if (supabase) {
        try {
          await supabase.from('room_members').insert([
            { room_id: roomId, user_email: email, nickname: userNick }
          ]);
        } catch (err) {
          console.error('Supabase write member err:', err);
        }
      }
    }

    return foundRoom;
  },

  // 3. 내가 참여 중인 방 리스트 가져오기
  async getUserRooms(): Promise<Room[]> {
    const email = await this.getCurrentUserEmail();
    if (!email) return [];

    const members = getLocal<RoomMember[]>('room_members_list', []);
    const userJoinedRoomIds = members.filter(m => m.userEmail === email).map(m => m.roomId);

    const rooms = getLocal<Room[]>('rooms_list', []);
    return rooms.filter(r => userJoinedRoomIds.includes(r.id));
  },

  // 4. 방 상세정보 가져오기
  async getRoomDetail(roomId: string): Promise<Room | null> {
    const rooms = getLocal<Room[]>('rooms_list', []);
    const r = rooms.find(room => room.id === roomId);
    if (r) return r;

    // 만약 로컬에 없으면 Supabase에서 가져옴
    if (supabase) {
      try {
        const { data } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
        if (data) {
          const roomObj: Room = {
            id: data.id,
            name: data.name,
            creator: data.creator,
            createdAt: Date.now()
          };
          // 로컬 목록에 추가
          setLocal('rooms_list', [...rooms, roomObj]);
          return roomObj;
        }
      } catch (err) {
        console.error('Supabase getRoomDetail err:', err);
      }
    }

    // fallback (초대 테스트용 데모 방 생성)
    const demoRoom: Room = {
      id: roomId,
      name: '초대받은 새로운 방',
      creator: 'system@hashnapse.com',
      createdAt: Date.now()
    };
    setLocal('rooms_list', [...rooms, demoRoom]);
    return demoRoom;
  },

  // 5. 방 멤버 목록 가져오기
  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    const members = getLocal<RoomMember[]>('room_members_list', []);
    return members.filter(m => m.roomId === roomId);
  },

  // 6. 방 탈퇴하기
  async leaveRoom(roomId: string): Promise<void> {
    if (roomId === 'global') {
      throw new Error('공개 스페이스(해시냅스 광장)는 탈퇴할 수 없습니다.');
    }

    const email = await this.getCurrentUserEmail();
    if (!email) return;

    const members = getLocal<RoomMember[]>('room_members_list', []);
    const remainingMembers = members.filter(m => !(m.roomId === roomId && m.userEmail === email));
    setLocal('room_members_list', remainingMembers);

    if (supabase) {
      try {
        await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_email', email);
      } catch (err) {
        console.error('Supabase leave room err:', err);
      }
    }
  },

  // ==================== [ 닉네임 설정 및 관리 ] ====================
  
  // 1. 유저 닉네임 가져오기
  async getUserNickname(): Promise<string> {
    const email = await this.getCurrentUserEmail();
    if (!email) return '스타팬';

    const nicknames = getLocal<Record<string, string>>('user_nicknames', {});
    if (nicknames[email]) {
      return nicknames[email];
    }

    // fallback: 이메일 앞부분 잘라서 기본 닉네임 생성
    const defaultNick = email.split('@')[0];
    nicknames[email] = defaultNick;
    setLocal('user_nicknames', nicknames);
    return defaultNick;
  },

  // 2. 유저 닉네임 저장하기
  async saveUserNickname(newNickname: string): Promise<void> {
    const email = await this.getCurrentUserEmail();
    if (!email) return;

    const nicknames = getLocal<Record<string, string>>('user_nicknames', {});
    nicknames[email] = newNickname;
    setLocal('user_nicknames', nicknames);

    // 내가 가입한 모든 방 멤버 명부 닉네임 업데이트
    const members = getLocal<RoomMember[]>('room_members_list', []);
    const updatedMembers = members.map(m => {
      if (m.userEmail === email) {
        return { ...m, nickname: newNickname };
      }
      return m;
    });
    setLocal('room_members_list', updatedMembers);

    if (supabase) {
      try {
        // user_profiles 테이블에 닉네임 저장 시도 (없는 경우 예외로 조용히 무시)
        await supabase.from('user_profiles').upsert({ id: email, nickname: newNickname });
        
        // 가입된 모든 방 멤버 정보의 닉네임 컬럼도 갱신
        await supabase.from('room_members').update({ nickname: newNickname }).eq('user_email', email);
      } catch (err) {
        console.log('Optional supabase profiles write ignored:', err);
      }
    }
  },



  // ==================== [ 방 멤버 퇴출(강퇴) 투표 로직 ] ====================

  // 1. 특정 멤버 퇴출 투표 발의 및 찬성 투표 참여
  async voteKickMember(roomId: string, targetEmail: string): Promise<{ success: boolean; message: string; checkStatus: { votedCount: number; requiredCount: number; currentPct: number; kicked: boolean } }> {
    const myEmail = await this.getCurrentUserEmail();
    if (!myEmail) throw new Error('로그인이 필요합니다.');
    if (myEmail === targetEmail) throw new Error('자기 자신을 강퇴할 수는 없습니다.');

    const kickVotes = getLocal<KickVote[]>('kick_votes_list', []);
    let voteIndex = kickVotes.findIndex(v => v.roomId === roomId && v.targetEmail === targetEmail);

    if (voteIndex < 0) {
      // 새로운 강퇴 투표 발의
      kickVotes.push({
        roomId,
        targetEmail,
        votedEmails: [myEmail]
      });
      voteIndex = kickVotes.length - 1;
    } else {
      // 기존 투표 찬성
      const vote = kickVotes[voteIndex];
      if (vote.votedEmails.includes(myEmail)) {
        throw new Error('이미 이 멤버의 퇴출에 동의하셨습니다.');
      }
      vote.votedEmails.push(myEmail);
    }

    setLocal('kick_votes_list', kickVotes);

    // 정족수 상태 계산 및 퇴출 결정
    const status = await this.evaluateKickStatus(roomId, targetEmail);
    
    if (status.kicked) {
      // 실제 퇴출 조치 단행: 방 멤버 목록에서 제거
      const members = getLocal<RoomMember[]>('room_members_list', []);
      const updatedMembers = members.filter(m => !(m.roomId === roomId && m.userEmail === targetEmail));
      setLocal('room_members_list', updatedMembers);

      // 사용된 투표 객체 제거
      const remainingVotes = kickVotes.filter(v => !(v.roomId === roomId && v.targetEmail === targetEmail));
      setLocal('kick_votes_list', remainingVotes);

      if (supabase) {
        try {
          await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_email', targetEmail);
        } catch (err) {
          console.error('Supabase write member kick err:', err);
        }
      }

      return {
        success: true,
        message: `📢 정족수를 달성하여 [ ${targetEmail} ] 멤버를 방에서 성공적으로 퇴출 조치했습니다!`,
        checkStatus: status
      };
    }

    return {
      success: true,
      message: '퇴출 찬성 투표를 완료했습니다.',
      checkStatus: status
    };
  },

  // 2. 강퇴 투표 현황 및 정족수 판단 내부 메서드
  async evaluateKickStatus(roomId: string, targetEmail: string): Promise<{ votedCount: number; requiredCount: number; currentPct: number; kicked: boolean }> {
    const kickVotes = getLocal<KickVote[]>('kick_votes_list', []);
    const vote = kickVotes.find(v => v.roomId === roomId && v.targetEmail === targetEmail);
    
    const votedCount = vote ? vote.votedEmails.length : 0;

    // 현재 방의 총 멤버 수 파악
    const members = await this.getRoomMembers(roomId);
    const totalMembers = members.length;

    let requiredCount = 0;
    // 조건: 9명 이상인 경우 1/3 찬성, 8명 이하인 경우 2/3 찬성
    if (totalMembers >= 9) {
      requiredCount = Math.ceil(totalMembers / 3);
    } else {
      requiredCount = Math.ceil((totalMembers * 2) / 3);
    }

    // 강퇴 대상은 본인 표를 던질 수 없으므로 실제 찬성 가능한 인원수가 정족수 이상인지 판단
    const currentPct = totalMembers > 0 ? Math.round((votedCount / totalMembers) * 100) : 0;
    const kicked = votedCount >= requiredCount;

    return {
      votedCount,
      requiredCount,
      currentPct,
      kicked
    };
  },

  // ==================== [ X(Twitter) 자동 집계 연동 시뮬레이션 ] ====================

  // X 계정 연동 상태 가져오기
  async getXConnectionStatus(): Promise<{ isConnected: boolean; xHandle: string }> {
    const isConnected = getLocal<boolean>('x_connected', false);
    const xHandle = getLocal<string>('x_handle', '');
    return { isConnected, xHandle };
  },

  // X 계정 연동 설정하기
  async connectXAccount(xHandle: string): Promise<void> {
    const handle = xHandle.startsWith('@') ? xHandle : `@${xHandle}`;
    setLocal('x_connected', true);
    setLocal('x_handle', handle);
    
    if (supabase) {
      try {
        const email = await this.getCurrentUserEmail();
        if (email) {
          await supabase.from('user_assets').update({
            x_connected: true,
            x_handle: handle
          }).eq('id', email);
        }
      } catch (err) {
        console.error('Error syncing connectXAccount to Supabase:', err);
      }
    }
  },

  // X 계정 연동 해제하기
  async disconnectXAccount(): Promise<void> {
    setLocal('x_connected', false);
    setLocal('x_handle', '');
    
    if (supabase) {
      try {
        const email = await this.getCurrentUserEmail();
        if (email) {
          await supabase.from('user_assets').update({
            x_connected: false,
            x_handle: null
          }).eq('id', email);
        }
      } catch (err) {
        console.error('Error syncing disconnectXAccount to Supabase:', err);
      }
    }
  },

  // 오늘 트윗 투표 기여 횟수 가져오기 (일 최대 10회 제한, 23:00 초기화)
  async getTodayTweetVotes(): Promise<{ count: number; maxLimit: number; nextResetTime: string }> {
    const lastReset = getLastResetTimestamp();
    const storedReset = getLocal<number>('x_tweet_vote_last_reset', 0);
    
    if (storedReset !== lastReset) {
      setLocal('x_tweet_vote_last_reset', lastReset);
      setLocal('today_tweet_votes_count', 0);
    }
    
    const count = getLocal<number>('today_tweet_votes_count', 0);
    
    // 다음 리셋 시간 계산
    const nextResetDate = new Date(lastReset);
    nextResetDate.setDate(nextResetDate.getDate() + 1);
    const formatReset = `${nextResetDate.getMonth() + 1}월 ${nextResetDate.getDate()}일 23:00`;
    
    return { count, maxLimit: 999999, nextResetTime: formatReset };
  },

  // 트윗 전송 시뮬레이션 실행 (방별 격리)
  async simulateTweetSubmit(roomId: string = 'global', tweetContent: string): Promise<{ success: boolean; message: string; matchedCharacters: string[] }> {
    const { isConnected } = await this.getXConnectionStatus();
    if (!isConnected) {
      return { success: false, message: 'X(Twitter) 계정이 연동되지 않았습니다.', matchedCharacters: [] };
    }

    const { count } = await this.getTodayTweetVotes();

    const lowerTweet = tweetContent.toLowerCase();
    const hasTagOrMention = 
      lowerTweet.includes('#해시냅스') || 
      lowerTweet.includes('#hashnapse') || 
      lowerTweet.includes('@해시냅스') || 
      lowerTweet.includes('@hashnapse');

    if (!hasTagOrMention) {
      return { success: false, message: '트윗 내용 중 필수 태그(#해시냅스 또는 @hashnapse 등)가 포함되지 않았습니다.', matchedCharacters: [] };
    }

    const assets = await this.getUserAsset(roomId);
    assets.availableVotes = (assets.availableVotes || 0) + 1;
    await this.saveUserAsset(roomId, assets);

    setLocal('today_tweet_votes_count', count + 1);

    return {
      success: true,
      message: `🎉 필수 해시태그 [#해시냅스] 언급 트윗이 감지되었습니다!\n획득한 포인트 1 P가 즉시 사용 가능한 보유 포인트로 지급되었습니다.`,
      matchedCharacters: ['#해시냅스']
    };
  },

  // 광고 시청 후 10 포인트 즉시 지급 (방별 격리)
  async claimAdReward(roomId: string = 'global'): Promise<UserAsset> {
    const assets = await this.getUserAsset(roomId);
    assets.availableVotes = (assets.availableVotes || 0) + 10;
    await this.saveUserAsset(roomId, assets);
    return assets;
  }
};

function selectedCharacterName(list: Character[], charId: string): string {
  const c = list.find(x => x.id === charId);
  return c ? c.name : '캐릭터';
}

function getLastResetTimestamp(): number {
  const now = new Date();
  const resetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0, 0, 0);
  
  if (now.getTime() < resetTime.getTime()) {
    // 23시 이전이므로 최근 리셋은 어제 23:00
    resetTime.setDate(resetTime.getDate() - 1);
  }
  return resetTime.getTime();
}
